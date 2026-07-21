import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function JobSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const cleanQ = q.trim();
      let orQuery = `job_number.ilike.%${cleanQ}%,customer_name.ilike.%${cleanQ}%,company.ilike.%${cleanQ}%,enq_number.ilike.%${cleanQ}%`;
      
      if (/^\d+$/.test(cleanQ)) {
        orQuery += `,erp_job_id.eq.${cleanQ}`;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('job_number, customer_name, company, enq_number')
        .or(orQuery)
        .limit(15);
        
      if (!error && data) {
        setResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '400px' }}>
      <input 
        type="text" 
        value={query} 
        onChange={handleSearch} 
        placeholder="🔍 Search by Job #, Name, Company, Enq #"
        style={{
          width: '100%', padding: '10px 16px', borderRadius: '24px', border: '1px solid var(--border-color)',
          background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.9rem',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
        }}
      />
      {searching && <div style={{ position: 'absolute', right: '16px', top: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Searching...</div>}
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, minWidth: '420px',
          background: 'var(--surface-color)', 
          backdropFilter: 'blur(24px)', border: '1px solid var(--border-color)', borderRadius: '16px',
          marginTop: '8px', zIndex: 1000, maxHeight: '380px', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          {results.map(job => (
            <div 
              key={job.job_number}
              onClick={() => {
                setQuery('');
                setResults([]);
                window.location.href = `/dashboard/job/${encodeURIComponent(job.job_number)}`;
              }}
              style={{
                padding: '0.75rem 1.15rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', gap: '0.4rem'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Line 1: Job Number (Left) & Enq Number (Right) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  📋 {job.job_number}
                </span>
                {job.enq_number ? (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9333ea', background: 'rgba(147, 51, 234, 0.1)', padding: '0.18rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
                    🔍 {job.enq_number}
                  </span>
                ) : <span />}
              </div>

              {/* Line 2: Client Name | Company Name (Truncated if long) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', width: '100%', overflow: 'hidden' }}>
                <span style={{ fontWeight: 700, color: '#16a34a', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  👤 {job.customer_name || 'No Name'}
                </span>
                <span style={{ color: 'var(--text-secondary)', opacity: 0.4, flexShrink: 0 }}>|</span>
                <span style={{ 
                  fontWeight: 700, color: '#ea580c', background: 'rgba(234, 88, 12, 0.08)', 
                  padding: '0.15rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap', 
                  overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 
                }}>
                  🏢 {job.company || 'Individual'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
