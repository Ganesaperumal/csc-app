import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase';
import styles from './bulkUpload.module.css';

export default function BulkPodUploadModal({ onClose, onUploadComplete }: { onClose: () => void, onUploadComplete: () => void }) {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Parse filename to see if it matches POD-YY-X.pdf format
  const parseFilename = (name: string) => {
    // Auto correct _ to - and lowercase to uppercase
    const normalized = name.toUpperCase().replace(/_/g, '-');
    const regex = /^POD-(\d{2})-(\d+)\.PDF$/;
    const match = normalized.match(regex);
    
    if (match) {
      return { isValid: true, normalizedName: normalized, jobIdMatch: `JB/${match[2]}/${match[1]}/DEL` }; // Assuming basic format matching
    }
    return { isValid: false, normalizedName: name, jobIdMatch: null };
  };

  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[]) => {
    setProcessing(true);
    
    const newFiles: any[] = [];
    
    // Process accepted files sequentially
    for (const file of acceptedFiles) {
      const { isValid, normalizedName, jobIdMatch } = parseFilename(file.name);
      
      let status = isValid ? 'Ready' : 'Rejected';
      let existingPod = null;

      if (isValid && jobIdMatch) {
        try {
          const { data } = await supabase.from('job_pods').select('*').eq('job_number', jobIdMatch).eq('status', 'active').maybeSingle();
          if (data) {
            status = 'Conflict';
            existingPod = data;
          }
        } catch (err) {
          console.error(err);
        }
      }

      newFiles.push({ 
        file, 
        originalName: file.name, 
        normalizedName, 
        isValid, 
        status, 
        jobIdMatch, 
        existingPod,
        uploadProgress: 0,
        uploadStatus: 'pending'
      });
    }
    
    // Add rejected files as well
    for (const rejection of fileRejections) {
      newFiles.push({
        file: rejection.file,
        originalName: rejection.file.name,
        normalizedName: rejection.file.name,
        isValid: false,
        status: 'Rejected',
        jobIdMatch: null,
        existingPod: null,
        uploadProgress: 0,
        uploadStatus: 'pending'
      });
    }
    
    setFiles((prev) => [...prev, ...newFiles]);
    setProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

  const handleUploadAll = async () => {
    const readyFiles = files.filter(f => f.status === 'Ready' || f.status === 'Conflict (Resolve Keep Both)');
    if (readyFiles.length === 0) return;
    
    setUploading(true);
    
    const uploadFileWithProgress = (url: string, file: File, normalizedName: string) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setFiles(prev => prev.map(f => f.normalizedName === normalizedName ? { ...f, uploadProgress: percentComplete, uploadStatus: 'uploading' } : f));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles(prev => prev.map(f => f.normalizedName === normalizedName ? { ...f, uploadProgress: 100, uploadStatus: 'success' } : f));
            resolve(xhr.response);
          } else {
            setFiles(prev => prev.map(f => f.normalizedName === normalizedName ? { ...f, uploadStatus: 'error' } : f));
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          setFiles(prev => prev.map(f => f.normalizedName === normalizedName ? { ...f, uploadStatus: 'error' } : f));
          reject(new Error('Network error during upload'));
        };
        
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    };

    // Upload files concurrently
    await Promise.all(readyFiles.map(async (f) => {
      try {
        // 1. Get presigned URL
        const res = await fetch('/api/pod/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: f.normalizedName, contentType: f.file.type })
        });
        const { presignedUrl, publicUrl } = await res.json();

        // 2. Upload to Cloudflare R2 with progress tracking
        await uploadFileWithProgress(presignedUrl, f.file, f.normalizedName);

        // 3. Save to Supabase DB via API route
        await fetch('/api/pod/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_number: f.jobIdMatch,
            filename: f.normalizedName,
            r2_url: publicUrl,
            file_size_bytes: f.file.size
          })
        });
      } catch (err) {
        console.error('Failed to upload', f.normalizedName, err);
      }
    }));

    setUploading(false);
    onUploadComplete();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--bg-color)', padding: '2rem', borderRadius: '12px', width: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>Bulk Upload PODs (Cloudflare R2)</h2>
        
        <div {...getRootProps()} style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', marginBottom: '1.5rem', background: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
          <input {...getInputProps()} />
          {processing ? (
            <p style={{ color: '#3b82f6', fontWeight: 'bold' }}>Processing files, please wait...</p>
          ) : (
            <>
              <p>Drag & drop PDF files here, or click to select files</p>
              <small>Only standard format (e.g., POD-26-1234.pdf) will be accepted.</small>
            </>
          )}
        </div>

        {files.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th>Filename</th>
                <th>Status</th>
                <th>Job Match</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.5rem 0' }}>{f.originalName} {f.normalizedName !== f.originalName && <small style={{display:'block', color:'gray'}}>Auto-corrected: {f.normalizedName}</small>}</td>
                  <td>
                    {f.uploadStatus === 'uploading' || f.uploadStatus === 'success' || f.uploadStatus === 'error' ? (
                      <div style={{ width: '100%', minWidth: '120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px', fontWeight: 'bold', color: f.uploadStatus === 'error' ? '#ef4444' : f.uploadStatus === 'success' ? '#10b981' : '#3b82f6' }}>
                          <span>{f.uploadStatus === 'error' ? 'Failed' : f.uploadStatus === 'success' ? 'Completed' : 'Uploading...'}</span>
                          <span>{f.uploadProgress}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: f.uploadStatus === 'error' ? '#ef4444' : f.uploadStatus === 'success' ? '#10b981' : '#3b82f6', width: `${f.uploadProgress}%`, transition: 'width 0.2s ease' }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        {f.status === 'Ready' && <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢 Ready</span>}
                        {f.status === 'Conflict' && <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>🟡 Conflict (File Exists)</span>}
                        {f.status === 'Rejected' && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 Invalid Format</span>}
                      </>
                    )}
                  </td>
                  <td>{f.jobIdMatch || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleUploadAll} disabled={uploading || files.filter(f => f.status === 'Ready').length === 0} style={{ padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'Ready').length} Valid PODs`}
          </button>
        </div>
      </div>
    </div>
  );
}
