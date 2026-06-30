'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SyncERPButton({ user: initialUser }: { user?: any }) {
  const [user, setUser] = useState(initialUser);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingBy, setSyncingBy] = useState('');
  const [isAdminOrManager, setIsAdminOrManager] = useState(false);
  
  useEffect(() => {
    // Fetch user if not passed
    if (!user) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setUser(data.user);
      });
    }
  }, [user]);

  useEffect(() => {
    // Check role from profiles
    if (user?.id) {
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data && (data.role === 'Admin' || data.role === 'Manager')) {
          setIsAdminOrManager(true);
        }
      });
    }

    // Initial fetch of lock status
    const checkStatus = async () => {
      const { data } = await supabase.from('sync_lock').select('*').eq('id', 1).single();
      if (data) {
        setIsSyncing(data.is_syncing);
        setSyncingBy(data.started_by || 'Someone');
      }
    };
    checkStatus();

    // Listen to changes in real-time
    const channel = supabase.channel('public:sync_lock')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sync_lock' }, (payload) => {
        setIsSyncing(payload.new.is_syncing);
        setSyncingBy(payload.new.started_by || 'Someone');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Fallback Polling Mechanism
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSyncing) {
      // Poll every 3 seconds to check if the lock has been cleared by the backend
      interval = setInterval(async () => {
        const { data } = await supabase.from('sync_lock').select('*').eq('id', 1).single();
        if (data && !data.is_syncing) {
          setIsSyncing(false);
          setSyncingBy('');
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSyncing]);

  const triggerSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncingBy('You');
    const username = user?.email?.split('@')[0] || 'User';

    // Lock it!
    await supabase.from('sync_lock').update({
      is_syncing: true,
      started_at: new Date().toISOString(),
      started_by: username
    }).eq('id', 1);

    try {
      // Trigger our local API endpoint that runs the sync
      const res = await fetch('/api/ingest-erp/manual-trigger', {
        method: 'POST'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error triggering sync: ' + err.message);
      
      // Only unlock immediately if the initial trigger failed
      await supabase.from('sync_lock').update({
        is_syncing: false
      }).eq('id', 1);
      setIsSyncing(false);
    }
  };

  if (!isAdminOrManager) return null;

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
      <button 
        onClick={triggerSync}
        disabled={isSyncing}
        style={{
          width: '100%',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          border: 'none',
          background: isSyncing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(45deg, #fde047, #fef08a)',
          color: isSyncing ? 'var(--text-secondary)' : '#0f172a',
          fontWeight: 'bold',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.2s ease',
          fontSize: '0.9rem'
        }}
      >
        {isSyncing ? (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            {syncingBy === 'You' ? 'Syncing ERP...' : `${syncingBy} is syncing...`}
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21v-5h5"></path></svg>
            Sync ERP Jobs
          </>
        )}
      </button>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
