'use client';
import { showToast } from '@/components/GlobalDialogs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/components/PermissionsContext';

export default function SyncERPButton({ user: initialUser, profile: initialProfile }: { user?: any; profile?: any }) {
  const [user, setUser] = useState(initialUser);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingBy, setSyncingBy] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const { getAccessLevel } = usePermissions();

  useEffect(() => {
    const resolveAccess = (profile: any) => {
      setCanEdit(profile?.csc_role === 'Edit');
    };

    if (initialProfile) {
      resolveAccess(initialProfile);
      return;
    }
    
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) resolveAccess(data);
    };

    if (!user) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setUser(data.user);
          fetchRole(data.user.id);
        }
      });
    } else {
      fetchRole(user.id);
    }
  }, [user, initialProfile]);

  useEffect(() => {
    // Initial fetch of lock status
    const checkStatus = async () => {
      const { data } = await supabase.from('sync_lock').select('*').eq('id', 1).single();
      if (data) {
        const startedAt = data.started_at ? new Date(data.started_at).getTime() : 0;
        const now = new Date().getTime();
        const isExpired = data.is_syncing && (now - startedAt > 300000); // 5 minutes

        if (isExpired) {
          await supabase.from('sync_lock').update({ is_syncing: false, started_by: null }).eq('id', 1);
          setIsSyncing(false);
          setSyncingBy('');
        } else {
          setIsSyncing(data.is_syncing);
          setSyncingBy(data.started_by || 'Someone');
        }
      }
    };
    checkStatus();

    // Listen to changes in real-time
    const channel = supabase.channel('public:sync_lock')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sync_lock' }, (payload) => {
        const startedAt = payload.new.started_at ? new Date(payload.new.started_at).getTime() : 0;
        const now = new Date().getTime();
        const isExpired = payload.new.is_syncing && (now - startedAt > 300000); // 5 minutes

        if (isExpired) {
          setIsSyncing(false);
          setSyncingBy('');
        } else {
          setIsSyncing(payload.new.is_syncing);
          setSyncingBy(payload.new.started_by || 'Someone');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Fallback Polling & Expiry Mechanism
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSyncing) {
      interval = setInterval(async () => {
        const { data } = await supabase.from('sync_lock').select('*').eq('id', 1).single();
        if (data) {
          const startedAt = data.started_at ? new Date(data.started_at).getTime() : 0;
          const now = new Date().getTime();
          const isExpired = data.is_syncing && (now - startedAt > 300000); // 5 minutes

          if (!data.is_syncing || isExpired) {
            if (isExpired && data.is_syncing) {
              await supabase.from('sync_lock').update({ is_syncing: false, started_by: null }).eq('id', 1);
            }
            setIsSyncing(false);
            setSyncingBy('');
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSyncing]);

  const triggerSync = async () => {
    if (isSyncing || !canEdit) return;
    
    setIsSyncing(true);
    setSyncingBy('You');

    try {
      const username = user?.email?.split('@')[0] || 'User';
      const res = await fetch('/api/ingest-erp/manual-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Sync failed');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error triggering sync: ' + err.message, 'error');
      
      await supabase.from('sync_lock').update({
        is_syncing: false
      }).eq('id', 1);
      setIsSyncing(false);
    }
  };

  const isBtnDisabled = isSyncing || !canEdit;

  return (
    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
      <button 
        onClick={canEdit ? triggerSync : undefined}
        disabled={isBtnDisabled}
        title={!canEdit ? 'Requires CSC Jobs Edit permission to Sync ERP' : undefined}
        style={{
          width: '100%',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          border: 'none',
          background: isBtnDisabled
            ? 'rgba(148, 163, 184, 0.16)'
            : 'linear-gradient(45deg, #fde047, #fef08a)',
          color: isBtnDisabled ? 'var(--text-secondary)' : '#1e293b',
          fontWeight: 'bold',
          cursor: isBtnDisabled ? 'not-allowed' : 'pointer',
          opacity: !canEdit ? 0.65 : 1,
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
            {!canEdit ? '🔒 Sync ERP Jobs' : 'Sync ERP Jobs'}
          </>
        )}
      </button>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
