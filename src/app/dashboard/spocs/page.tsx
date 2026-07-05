'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '../jobs.module.css';

interface CompanySpoc {
  id: string;
  company_name: string;
  spoc_name: string;
  created_at: string;
}

export default function SpocsPage() {
  const [spocs, setSpocs] = useState<CompanySpoc[]>([]);
  const [jobCompanies, setJobCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [spocName, setSpocName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);

  const filteredJobCompanies = useMemo(() => {
    const searchLower = companyName.toLowerCase().trim();
    if (!searchLower) return jobCompanies;
    return jobCompanies.filter(comp => comp.toLowerCase().includes(searchLower));
  }, [jobCompanies, companyName]);

  const handleAssignSpocs = async () => {
    if (!window.confirm('Are you sure you want to assign SPOCs to all existing jobs based on the company mappings?')) return;
    setAssigning(true);
    try {
      // Fetch all jobs using pagination to bypass the 1000 row API limit
      let allJobs: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allJobs = [...allJobs, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      // Create a map of clean company name -> SPOC name
      const spocMap = new Map<string, string>();
      spocs.forEach(s => {
        if (s.company_name && s.spoc_name) {
          const cleanName = s.company_name.trim().toLowerCase().replace(/\s+/g, ' ');
          spocMap.set(cleanName, s.spoc_name);
        }
      });

      // Filter jobs to find only the ones where the SPOC name actually changed or needs assignment
      const jobsToUpsert: any[] = [];
      allJobs.forEach(job => {
        if (job.company) {
          const cleanJobCompany = job.company.trim().toLowerCase().replace(/\s+/g, ' ');
          const matchedSpoc = spocMap.get(cleanJobCompany);
          if (matchedSpoc && job.spoc_name !== matchedSpoc) {
            jobsToUpsert.push({ ...job, spoc_name: matchedSpoc });
          }
        }
      });

      if (jobsToUpsert.length === 0) {
        alert('All jobs already have the correct SPOCs assigned. No updates needed!');
        setAssigning(false);
        return;
      }

      // Upsert in batches of 100 to prevent payload size errors
      const chunkSize = 100;
      for (let i = 0; i < jobsToUpsert.length; i += chunkSize) {
        const chunk = jobsToUpsert.slice(i, i + chunkSize);
        const { error: upsertError } = await supabase
          .from('jobs')
          .upsert(chunk, { onConflict: 'job_number' });
        if (upsertError) throw upsertError;
      }

      alert(`✅ Successfully assigned SPOCs to ${jobsToUpsert.length} jobs!`);
    } catch (err: any) {
      alert(`❌ Error assigning SPOCs: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [spocsRes, jobsRes] = await Promise.all([
      supabase.from('company_spocs').select('*').order('company_name', { ascending: true }),
      supabase.from('jobs').select('company')
    ]);
      
    if (spocsRes.error) {
      console.error('Error fetching SPOCs:', spocsRes.error);
    } else {
      setSpocs(spocsRes.data || []);
    }

    if (jobsRes.data) {
      const unique = Array.from(new Set(jobsRes.data.map(j => j.company).filter(Boolean)));
      setJobCompanies(unique as string[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (spoc: CompanySpoc) => {
    setEditingId(spoc.id);
    setCompanyName(spoc.company_name);
    setSpocName(spoc.spoc_name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setCompanyName('');
    setSpocName('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !spocName.trim()) {
      setError('Company Name and SPOC Name are required.');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    if (editingId) {
      const { error } = await supabase.from('company_spocs').update({ company_name: companyName, spoc_name: spocName }).eq('id', editingId);
      if (error) setError(error.message);
      else { handleCancel(); fetchData(); }
    } else {
      const { error } = await supabase.from('company_spocs').insert([{ company_name: companyName, spoc_name: spocName }]);
      if (error) setError(error.message);
      else { handleCancel(); fetchData(); }
    }
    setSaving(false);
  };

  const filteredSpocs = spocs.filter(s => 
    s.company_name.toLowerCase().includes(search.toLowerCase()) || 
    s.spoc_name.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueSpocNames = Array.from(new Set(spocs.map(s => s.spoc_name).filter(Boolean)));

  return (
    <div style={{ padding: '2rem 3rem', maxWidth: '1400px', margin: '0 auto', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ 
            fontSize: '2.2rem', 
            fontWeight: 800, 
            margin: 0,
            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            SPOC Management
          </h1>
          <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
            Manage your single points of contact for corporate clients.
          </p>
        </div>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>
        
        {/* Form Card */}
        <div style={{ 
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.8))',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px', 
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 10px 40px -10px rgba(79, 70, 229, 0.1)'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            marginBottom: '1.5rem', 
            color: '#0f172a', 
            fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.4rem' }}>{editingId ? '✏️' : '✨'}</span> 
            {editingId ? 'Edit SPOC' : 'Add New SPOC'}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Company Name <span style={{color: '#ef4444'}}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input 
                  style={{ 
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', 
                    borderRadius: '10px', border: '1px solid #cbd5e1', 
                    outline: 'none', background: '#f8fafc', fontSize: '0.95rem', 
                    color: '#0f172a', transition: 'all 0.2s ease'
                  }}
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  placeholder="Select or type company..."
                  onFocus={(e) => { 
                    e.currentTarget.style.borderColor = '#6366f1'; 
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'; 
                    e.currentTarget.style.background = '#fff'; 
                    setShowCompanySuggestions(true);
                  }}
                  onBlur={(e) => { 
                    e.currentTarget.style.borderColor = '#cbd5e1'; 
                    e.currentTarget.style.boxShadow = 'none'; 
                    e.currentTarget.style.background = '#f8fafc'; 
                    setShowCompanySuggestions(false);
                  }}
                />
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.1rem' }}>🏢</span>
                
                {showCompanySuggestions && filteredJobCompanies.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    backdropFilter: 'none',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '10px',
                    marginTop: '6px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {filteredJobCompanies.map((comp, idx) => (
                      <div 
                        key={idx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCompanyName(comp);
                          setShowCompanySuggestions(false);
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: '#1e293b',
                          fontWeight: 500,
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          borderBottom: idx < filteredJobCompanies.length - 1 ? '1px solid rgba(241, 245, 249, 0.8)' : 'none'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.color = '#4f46e5';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#1e293b';
                        }}
                      >
                        🏢 {comp}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>SPOC Name <span style={{color: '#ef4444'}}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input 
                  list="spoc-list"
                  style={{ 
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', 
                    borderRadius: '10px', border: '1px solid #cbd5e1', 
                    outline: 'none', background: '#f8fafc', fontSize: '0.95rem', 
                    color: '#0f172a', transition: 'all 0.2s ease'
                  }}
                  value={spocName} 
                  onChange={(e) => setSpocName(e.target.value)} 
                  placeholder="Select or type SPOC name..."
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f8fafc'; }}
                />
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.1rem' }}>👤</span>
                <datalist id="spoc-list">
                  {uniqueSpocNames.map((name, idx) => <option key={idx} value={name} />)}
                </datalist>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flex: '0 0 auto' }}>
              <button 
                type="submit" 
                disabled={saving} 
                style={{ 
                  padding: '0.85rem 2rem', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #c026d3 100%)', 
                  color: 'white', 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  transition: 'all 0.2s ease', 
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
                onMouseOver={(e) => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(79, 70, 229, 0.39)'; }}
              >
                {saving ? 'Saving...' : (editingId ? 'Update Record' : 'Add Record')}
              </button>
              
              {editingId && (
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  disabled={saving} 
                  style={{ 
                    padding: '0.85rem 1.5rem', 
                    borderRadius: '10px', 
                    border: '1px solid #cbd5e1', 
                    background: '#fff', 
                    color: '#64748b', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { if(!saving) e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          {error && (
            <div style={{ 
              marginTop: '1.25rem', padding: '0.75rem', borderRadius: '8px', 
              background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', 
              fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' 
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>
        
        {/* Table Section */}
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h2 style={{ fontSize: '1.3rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>Directory</h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={handleAssignSpocs}
                disabled={assigning}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '99px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  opacity: assigning ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {assigning ? 'Assigning...' : '🔄 Assign SPOCs to Jobs'}
              </button>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  style={{ 
                    width: '260px', padding: '0.65rem 1rem 0.65rem 2.2rem', 
                    borderRadius: '99px', border: '1px solid #cbd5e1', 
                    outline: 'none', background: 'rgba(255,255,255,0.8)', 
                    fontSize: '0.9rem', color: '#1e293b', transition: 'all 0.2s ease'
                  }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; }}
                />
              </div>
            </div>
          </div>

          <div className={styles.tableContainer} style={{ background: 'rgba(255,255,255,0.8)', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', color: '#64748b' }}>Company Name</th>
                  <th style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', color: '#64748b' }}>SPOC Name</th>
                  <th style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', color: '#64748b', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Loading contacts...</div>
                    </td>
                  </tr>
                ) : filteredSpocs.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredSpocs.map((spoc) => (
                    <tr key={spoc.id} style={{ transition: 'background 0.2s' }}>
                      <td style={{ fontWeight: 600, color: '#334155', padding: '1.25rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #e0e7ff, #f3e8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {spoc.company_name.substring(0, 2).toUpperCase()}
                          </div>
                          {spoc.company_name}
                        </div>
                      </td>
                      <td style={{ color: '#475569', padding: '1.25rem 1.5rem', fontWeight: 500 }}>{spoc.spoc_name}</td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleEdit(spoc)}
                          style={{ 
                            background: '#f1f5f9', border: '1px solid #e2e8f0', 
                            color: '#475569', cursor: 'pointer', fontWeight: 600, 
                            padding: '0.4rem 1rem', borderRadius: '99px', 
                            transition: 'all 0.2s ease', fontSize: '0.85rem'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
