'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import UserDetailsModal from '@/app/home/users/UserDetailsModal';
import { usePermissions } from '@/components/PermissionsContext';

export default function PendingApprovalsReminder({ profile }: { profile: any }) {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeModalUser, setActiveModalUser] = useState<any | null>(null);

  // Pending Sign-Up notifications are shown ONLY to Super Admin (is_super_admin === true)
  const isSuperAdmin = profile?.is_super_admin === true;

  useEffect(() => {
    if (!isSuperAdmin) return;

    fetchPendingUsers();

    // Check periodically every 30 seconds for new signups
    const interval = setInterval(fetchPendingUsers, 30000);
    return () => clearInterval(interval);
  }, [isSuperAdmin, profile]);

  if (!isSuperAdmin) return null;

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.users) {
        const pending = data.users.filter((u: any) => u.is_approved === false);
        setPendingUsers(pending);
      }
    } catch (err) {
      console.error('Error checking pending users:', err);
    }
  };

  const handleSaveUser = async (updatedData: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || 'Failed to update user profile');
      }
      setActiveModalUser(null);
      fetchPendingUsers();
    } catch (err: any) {
      console.error('[PendingApprovalsReminder] handleSaveUser error:', err);
    }
  };

  if (!isSuperAdmin || pendingUsers.length === 0) return null;

  return (
    <>
      {/* Inline Sidebar Pending Sign-Up Notification Banner */}
      <div 
        onClick={() => setShowModal(true)}
        style={{
          marginBottom: '0.4rem',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '50px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontWeight: 700,
          fontSize: '0.78rem',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          animation: 'badge-pulse 2.5s ease-in-out infinite'
        }}
      >
        <style>{`
          @keyframes badge-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
        `}</style>
        <span>🔔</span>
        <span>{pendingUsers.length} Pending Sign-Up{pendingUsers.length > 1 ? 's' : ''}</span>
      </div>

      {/* Reminders Modal Popup (Mimicking CSC Follow-up Reminders Popup) */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9995,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            fontFamily: "'Outfit', sans-serif"
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              padding: '1.75rem',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🔔</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pending User Registrations
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Review requested access and approve new staff accounts</span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Pending List */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingRight: '0.25rem' }}>
              {pendingUsers.map((pu) => (
                <div 
                  key={pu.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{pu.name || pu.username}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{pu.username} • {pu.username}@transworldintl.com</div>
                    </div>
                    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#d97706', fontSize: '0.72rem', fontWeight: 800 }}>
                      ⏳ Pending Approval
                    </span>
                  </div>

                  {/* Requested Modules */}
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    <strong>Requested Modules:</strong>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(79,70,229,0.1)', color: '#4f46e5', fontWeight: 700 }}>CSC: {pu.csc_access || pu.csc_role || 'None'}</span>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>Unbilled: {pu.unbilled_access || pu.unbilled_role || 'None'}</span>
                    </div>
                  </div>

                  {/* Actions — shown for Super Admin */}
                  {isSuperAdmin && (
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setActiveModalUser(pu)}
                      style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      ⚙️ Review
                    </button>
                  </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{ marginTop: '1.25rem', width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}
            >
              Close Reminder
            </button>
          </div>
        </div>
      )}

      {/* Slide-over User Details Modal */}
      {activeModalUser && (
        <UserDetailsModal
          user={activeModalUser}
          onClose={() => setActiveModalUser(null)}
          onSave={handleSaveUser}
          onDelete={async (userId: string) => {
            await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' });
            setActiveModalUser(null);
            fetchPendingUsers();
          }}
        />
      )}
    </>
  );
}
