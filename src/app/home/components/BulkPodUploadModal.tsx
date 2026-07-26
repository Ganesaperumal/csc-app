import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase';
import styles from './bulkUpload.module.css';

interface FileItem {
  id: string;
  file: File;
  originalName: string;
  fileSize: number; // in bytes
  extractedNum: string; // 1-5 digit job number extracted
  docType: string; // POD, DC, DN, INV, PO, PI, MA, LR, Invoice
  year: string; // 24, 25, 26, 27, 28
  matchedJobNumber: string; // Actual job_number found in DB (e.g. JB/463/26/BLR)
  status: 'Ready' | 'Ready (Larger File)' | 'Conflict' | 'Job Not Found' | 'Invalid Job ID';
  existingSize?: number;
  forceOverwrite?: boolean;
  uploadProgress: number;
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error';
}

const DOCUMENT_TYPES = ['POD', 'DC', 'DN', 'INV', 'PO', 'PI', 'MA', 'LR', 'Invoice'];
const YEARS = ['24', '25', '26', '27', '28'];

// Helper to format file size cleanly
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function BulkPodUploadModal({ onClose, onUploadComplete }: { onClose: () => void, onUploadComplete: () => void }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Global batch selection states
  const [globalDocType, setGlobalDocType] = useState<string>('POD');
  const [globalYear, setGlobalYear] = useState<string>('26');

  // Extract 1-5 continuous numeric digits from filename
  const extractJobNum = (name: string): string => {
    const match = name.match(/\d{1,5}/);
    return match ? match[0] : '';
  };

  const validateFileRow = async (extractedNum: string, year: string, docType: string, newFileSize: number): Promise<{ 
    status: 'Ready' | 'Ready (Larger File)' | 'Conflict' | 'Job Not Found' | 'Invalid Job ID', 
    matchedJobNumber: string,
    existingSize?: number 
  }> => {
    if (!extractedNum || !/^\d{1,5}$/.test(extractedNum)) {
      return { status: 'Invalid Job ID', matchedJobNumber: '' };
    }

    const numVal = parseInt(extractedNum, 10);
    const pattern = `JB/${extractedNum}/${year}/%`;
    const fallbackPattern = `%/${extractedNum}/%`;

    try {
      // 1. Search by exact erp_job_id OR job_number pattern with target year
      let { data } = await supabase
        .from('jobs')
        .select('job_number, erp_job_id, documents')
        .or(`erp_job_id.eq.${numVal},job_number.ilike.${pattern}`)
        .limit(1)
        .maybeSingle();

      // 2. Fallback: if not found, search by job_number containing the number
      if (!data) {
        const { data: fallbackData } = await supabase
          .from('jobs')
          .select('job_number, erp_job_id, documents')
          .ilike('job_number', fallbackPattern)
          .limit(1)
          .maybeSingle();
        data = fallbackData;
      }

      if (!data || !data.job_number) {
        return { status: 'Job Not Found', matchedJobNumber: '' };
      }

      const matchedJobNumber = data.job_number;

      if (data.documents && Array.isArray(data.documents)) {
        const existingDoc = data.documents.find((d: any) => d.type === docType);
        if (existingDoc) {
          const existingSize = existingDoc.file_size || 0;
          if (newFileSize > existingSize) {
            return { status: 'Ready (Larger File)', matchedJobNumber, existingSize };
          }
          return { status: 'Conflict', matchedJobNumber, existingSize };
        }
      }

      return { status: 'Ready', matchedJobNumber };
    } catch (err) {
      console.error('Job validation error:', err);
      return { status: 'Job Not Found', matchedJobNumber: '' };
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setProcessing(true);
    
    const newItems: FileItem[] = [];
    
    for (const file of acceptedFiles) {
      const extractedNum = extractJobNum(file.name);
      const year = globalYear;
      const docType = globalDocType;

      const { status, matchedJobNumber, existingSize } = await validateFileRow(extractedNum, year, docType, file.size);

      newItems.push({
        id: `${file.name}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        originalName: file.name,
        fileSize: file.size,
        extractedNum,
        docType,
        year,
        matchedJobNumber,
        status,
        existingSize,
        forceOverwrite: false,
        uploadProgress: 0,
        uploadStatus: 'pending'
      });
    }

    setFiles((prev) => [...prev, ...newItems]);
    setProcessing(false);
  }, [globalDocType, globalYear]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

  // Update an individual row's values and re-validate status
  const updateRow = async (id: string, updates: Partial<Pick<FileItem, 'extractedNum' | 'docType' | 'year' | 'forceOverwrite'>>) => {
    const target = files.find(f => f.id === id);
    if (!target) return;

    const extractedNum = updates.extractedNum !== undefined ? updates.extractedNum : target.extractedNum;
    const year = updates.year !== undefined ? updates.year : target.year;
    const docType = updates.docType !== undefined ? updates.docType : target.docType;
    const forceOverwrite = updates.forceOverwrite !== undefined ? updates.forceOverwrite : target.forceOverwrite;

    const { status, matchedJobNumber, existingSize } = await validateFileRow(extractedNum, year, docType, target.fileSize);

    setFiles(prev => prev.map(f => f.id === id ? {
      ...f,
      extractedNum,
      year,
      docType,
      matchedJobNumber,
      status,
      existingSize,
      forceOverwrite
    } : f));
  };

  // Remove a file row
  const removeRow = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Apply batch selection to all rows
  const applyGlobalSettings = async () => {
    setProcessing(true);
    const updatedFiles = await Promise.all(files.map(async (f) => {
      const { status, matchedJobNumber, existingSize } = await validateFileRow(f.extractedNum, globalYear, globalDocType, f.fileSize);
      return {
        ...f,
        docType: globalDocType,
        year: globalYear,
        matchedJobNumber,
        status,
        existingSize
      };
    }));
    setFiles(updatedFiles);
    setProcessing(false);
  };

  const handleUploadAll = async () => {
    const readyFiles = files.filter(f => f.status === 'Ready' || f.status === 'Ready (Larger File)' || (f.status === 'Conflict' && f.forceOverwrite));
    if (readyFiles.length === 0) return;
    
    setUploading(true);
    
    const uploadFileWithProgress = (url: string, file: File, fileId: string) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: percentComplete, uploadStatus: 'uploading' } : f));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadProgress: 100, uploadStatus: 'success' } : f));
            resolve(xhr.response);
          } else {
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadStatus: 'error' } : f));
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, uploadStatus: 'error' } : f));
          reject(new Error('Network error during upload'));
        };
        
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    };

    // Upload ready files concurrently
    await Promise.all(readyFiles.map(async (f) => {
      try {
        const uploadFilename = `${f.docType}-${f.year}-${f.extractedNum}.pdf`;

        // 1. Get presigned URL
        const res = await fetch('/api/documents/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: uploadFilename, contentType: f.file.type })
        });
        const { presignedUrl, publicUrl } = await res.json();

        // 2. Upload to Cloudflare R2 with progress tracking
        await uploadFileWithProgress(presignedUrl, f.file, f.id);

        // 3. Save to Supabase DB via API route
        await fetch('/api/documents/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_number: f.matchedJobNumber,
            filename: uploadFilename,
            r2_url: publicUrl,
            document_type: f.docType,
            file_size: f.fileSize
          })
        });
      } catch (err) {
        console.error('Failed to upload', f.originalName, err);
      }
    }));

    setUploading(false);
    onUploadComplete();
    onClose();
  };

  const readyToUploadCount = files.filter(f => f.status === 'Ready' || f.status === 'Ready (Larger File)' || (f.status === 'Conflict' && f.forceOverwrite)).length;
  const matchedCount = files.filter(f => f.status === 'Ready' || f.status === 'Ready (Larger File)').length;
  const notFoundCount = files.filter(f => f.status === 'Job Not Found').length;
  const conflictCount = files.filter(f => f.status === 'Conflict').length;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--bg-color)', padding: '2rem', borderRadius: '12px', width: '1050px', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>Bulk Upload Documents (Cloudflare R2 & Supabase)</h2>

        
        <div {...getRootProps()} style={{ border: '2px dashed var(--border-color)', padding: '1.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', marginBottom: '1.5rem', background: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
          <input {...getInputProps()} />
          {processing ? (
            <p style={{ color: '#3b82f6', fontWeight: 'bold' }}>Searching jobs across all branches & ERP IDs in Supabase, please wait...</p>
          ) : (
            <>
              <p style={{ fontWeight: 'bold' }}>Drag & drop PDF files here, or click to select files</p>
              <small style={{ color: 'gray' }}>Continuous 1-5 digits will be matched against ERP Job IDs and all branch Job Numbers in Supabase automatically.</small>
            </>
          )}
        </div>

        {files.length > 0 && (
          <>
            {/* Status Summary Cards */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, padding: '0.6rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢 Ready / Auto-Selected: {matchedCount}</span>
              </div>
              <div style={{ flex: 1, padding: '0.6rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 Unmatched (No Job): {notFoundCount}</span>
              </div>
              <div style={{ flex: 1, padding: '0.6rem 1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>🟡 Existing (Smaller/Equal File): {conflictCount}</span>
              </div>
            </div>

            {/* Global Batch Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Batch Assign:</span>
              <div>
                <label style={{ fontSize: '0.8rem', marginRight: '0.5rem', color: 'gray' }}>Doc Type:</label>
                <select value={globalDocType} onChange={(e) => setGlobalDocType(e.target.value)} style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                  {DOCUMENT_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', marginRight: '0.5rem', color: 'gray' }}>Year:</label>
                <select value={globalYear} onChange={(e) => setGlobalYear(e.target.value)} style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={applyGlobalSettings} disabled={processing} style={{ padding: '0.35rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Apply to All Rows
              </button>
            </div>

            {/* Editable Confirmation Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Filename</th>
                  <th style={{ padding: '0.5rem' }}>Size</th>
                  <th style={{ padding: '0.5rem' }}>Job No (1-5 Digits)</th>
                  <th style={{ padding: '0.5rem' }}>Year</th>
                  <th style={{ padding: '0.5rem' }}>Doc Type</th>
                  <th style={{ padding: '0.5rem' }}>Matched Supabase Job Number</th>
                  <th style={{ padding: '0.5rem' }}>Supabase Match & Size Status</th>
                  <th style={{ padding: '0.5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.originalName}>
                      {f.originalName}
                    </td>
                    <td style={{ padding: '0.5rem', color: 'gray' }}>
                      {formatBytes(f.fileSize)}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        value={f.extractedNum}
                        maxLength={5}
                        onChange={(e) => updateRow(f.id, { extractedNum: e.target.value.replace(/\D/g, '') })}
                        placeholder="XXXXX"
                        style={{ width: '65px', padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={f.year}
                        onChange={(e) => updateRow(f.id, { year: e.target.value })}
                        style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                      >
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <select
                        value={f.docType}
                        onChange={(e) => updateRow(f.id, { docType: e.target.value })}
                        style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                      >
                        {DOCUMENT_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>
                      {f.matchedJobNumber ? (
                        <span style={{ color: '#10b981' }}>{f.matchedJobNumber}</span>
                      ) : (
                        <span style={{ color: 'gray' }}>No match found</span>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {f.uploadStatus === 'uploading' || f.uploadStatus === 'success' || f.uploadStatus === 'error' ? (
                        <div style={{ width: '100%', minWidth: '100px' }}>
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
                          {f.status === 'Ready' && <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢 Matched & Ready</span>}
                          {f.status === 'Ready (Larger File)' && (
                            <span style={{ color: '#10b981', fontWeight: 'bold' }} title={`New file (${formatBytes(f.fileSize)}) > Existing (${formatBytes(f.existingSize || 0)})`}>
                              🟢 Auto-Selected (Larger {formatBytes(f.fileSize)})
                            </span>
                          )}
                          {f.status === 'Conflict' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ color: '#f59e0b', fontWeight: 'bold' }} title={`New file (${formatBytes(f.fileSize)}) <= Existing (${formatBytes(f.existingSize || 0)})`}>
                                🟡 Existing ({formatBytes(f.existingSize || 0)})
                              </span>
                              <label style={{ fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <input
                                  type="checkbox"
                                  checked={f.forceOverwrite || false}
                                  onChange={(e) => updateRow(f.id, { forceOverwrite: e.target.checked })}
                                />
                                Overwrite
                              </label>
                            </div>
                          )}
                          {f.status === 'Job Not Found' && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🔴 Unmatched (No DB Job)</span>}
                          {f.status === 'Invalid Job ID' && <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>⚪ Missing No</span>}
                        </>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <button onClick={() => removeRow(f.id)} title="Remove file" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleUploadAll} disabled={uploading || readyToUploadCount === 0} style={{ padding: '0.5rem 1rem', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: uploading || readyToUploadCount === 0 ? 0.6 : 1 }}>
            {uploading ? 'Uploading...' : `Upload ${readyToUploadCount} Selected Documents`}
          </button>
        </div>
      </div>
    </div>
  );
}

