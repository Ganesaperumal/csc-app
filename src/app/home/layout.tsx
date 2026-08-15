'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PermissionsProvider } from '@/components/PermissionsContext';
import Link from 'next/link';
import styles from './home.module.css';
import ProfilePopup from './components/ProfilePopup';
import SyncERPButton from './components/SyncERPButton';
import CommandPalette from './components/CommandPalette';
import AIChatbot from '../components/AIChatbot';
import GlobalDialogs, { showToast } from '@/components/GlobalDialogs';
import PendingApprovalsReminder from './components/PendingApprovalsReminder';


function DashboardNav({ profile, user }: { profile: any; user: any }) {
  const pathname = usePathname();

  // ─── Direct Profile Column Permissions (Single Source of Truth) ───
  const cscRole = profile?.csc_access || profile?.csc_role || 'None';
  const followupsRole = profile?.followups_access || profile?.followups_role || 'None';
  const allJobsRole = profile?.all_jobs_access || profile?.all_jobs_role || 'None';
  const unbilledRole = profile?.unbilled_access || profile?.unbilled_role || 'None';

  const isSuperAdmin = profile?.is_super_admin === true;
  const canAccessSpoc = isSuperAdmin;

  const canAccessCsc = cscRole !== 'None' && cscRole !== '';
  const canAccessActive = canAccessCsc;
  const canAccessClosed = canAccessCsc;
  const canAccessFollowUps = followupsRole !== 'None' && followupsRole !== '';
  const canAccessAllJobs = allJobsRole !== 'None' && allJobsRole !== '';
  const canAccessUnbilled = unbilledRole !== 'None' && unbilledRole !== '';
  const canAccessReports = canAccessCsc || (followupsRole !== 'None' && followupsRole !== '');

  const isActiveActive = pathname.startsWith('/home/active-jobs');
  const isClosedActive = pathname === '/home/closed-jobs';
  const isFollowUpsActive = pathname === '/home/follow-ups';
  const isAllJobsActive = pathname === '/home/all-jobs';
  const isSpocActive = pathname.startsWith('/home/spoc');
  const isLogsActive = pathname === '/home/logs';
  const isUnbilledActive = pathname.startsWith('/home/unbilled');
  const isReportsActive = pathname === '/home/reports';
  const isShowcaseActive = pathname === '/home/ui-showcase';

  // Determine active item key & pill styling
  let activeKey = '';
  let pillGradient = 'linear-gradient(135deg, #10b981, #059669)';
  let pillGlow = '0 4px 14px rgba(16, 185, 129, 0.35)';

  if (isActiveActive) {
    activeKey = 'active';
    pillGradient = 'linear-gradient(135deg, #10b981, #059669)';
    pillGlow = '0 4px 14px rgba(16, 185, 129, 0.35)';
  } else if (isClosedActive) {
    activeKey = 'closed';
    pillGradient = 'linear-gradient(135deg, #6366f1, #4f46e5)';
    pillGlow = '0 4px 14px rgba(79, 70, 229, 0.35)';
  } else if (isFollowUpsActive) {
    activeKey = 'followups';
    pillGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
    pillGlow = '0 4px 14px rgba(245, 158, 11, 0.35)';
  } else if (isAllJobsActive) {
    activeKey = 'alljobs';
    pillGradient = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    pillGlow = '0 4px 14px rgba(59, 130, 246, 0.35)';
  } else if (isUnbilledActive) {
    activeKey = 'unbilled';
    pillGradient = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
    pillGlow = '0 4px 14px rgba(139, 92, 246, 0.35)';
  } else if (isReportsActive) {
    activeKey = 'reports';
    pillGradient = 'linear-gradient(135deg, #ec4899, #be185d)';
    pillGlow = '0 4px 14px rgba(236, 72, 153, 0.35)';
  } else if (isShowcaseActive) {
    activeKey = 'showcase';
    pillGradient = 'linear-gradient(135deg, #06b6d4, #0891b2)';
    pillGlow = '0 4px 14px rgba(6, 182, 212, 0.35)';
  }

  // Ref tracking for pixel-perfect 2D glider pill placement
  const panelRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useEffect(() => {
    if (!panelRef.current || !activeKey) {
      setPillStyle({ opacity: 0 });
      return;
    }
    const activeEl = panelRef.current.querySelector(`[data-nav-key="${activeKey}"]`) as HTMLElement;
    if (activeEl) {
      const panelRect = panelRef.current.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setPillStyle({
        top: `${elRect.top - panelRect.top}px`,
        left: `${elRect.left - panelRect.left}px`,
        width: `${elRect.width}px`,
        height: `${elRect.height}px`,
        background: pillGradient,
        boxShadow: pillGlow,
        opacity: 1
      });
    }
  }, [pathname, activeKey, pillGradient, pillGlow]);

  return (
    <nav className={styles.nav} style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', gap: '0.35rem' }}>
      
      {/* ═══ UNIFIED NAVIGATION PANEL ═══ */}
      <div 
        ref={panelRef}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '6px',
          backgroundColor: 'rgba(148, 163, 184, 0.12)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
          marginBottom: '0.5rem'
        }}
      >
        {/* ── 2D Dynamic Sliding Glider Pill Background ── */}
        <div style={{
          position: 'absolute',
          borderRadius: '10px',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'top 0.35s cubic-bezier(0.34, 1.25, 0.64, 1), left 0.35s cubic-bezier(0.34, 1.25, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.25, 0.64, 1), height 0.35s cubic-bezier(0.34, 1.25, 0.64, 1), background 0.3s ease, box-shadow 0.3s ease, opacity 0.2s ease',
          ...pillStyle
        }} />

        {/* Line 1: Active Jobs (Full Width) */}
        {canAccessActive && (
          <Link
            href="/home/active-jobs"
            data-nav-key="active"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isActiveActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>⚡</span> Active Jobs
          </Link>
        )}

        {/* Line 2: Closed Jobs (Full Width) */}
        {canAccessClosed && (
          <Link
            href="/home/closed-jobs"
            data-nav-key="closed"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isClosedActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>🗃️</span> Closed Jobs
          </Link>
        )}

        {/* Row 2: Follow-ups (Full Width) */}
        {canAccessFollowUps && (
          <Link
            href="/home/follow-ups"
            data-nav-key="followups"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isFollowUpsActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>⏰</span> Follow-ups
          </Link>
        )}

        {/* Row 3: All Jobs (Full Width) */}
        {canAccessAllJobs && (
          <Link
            href="/home/all-jobs"
            data-nav-key="alljobs"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isAllJobsActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>📁</span> All Jobs
          </Link>
        )}

        {/* Row 4: Unbilled (Full Width) */}
        {canAccessUnbilled && (
          <Link
            href="/home/unbilled"
            data-nav-key="unbilled"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isUnbilledActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>🧾</span> Unbilled
          </Link>
        )}

        {/* Row 5: Reports (Full Width) */}
        {canAccessReports && (
          <Link
            href="/home/reports"
            data-nav-key="reports"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isReportsActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>📊</span> Reports
          </Link>
        )}

        {/* Row 6: UI Showcase */}
        {profile?.is_super_admin === true && (
          <Link
            href="/home/ui-showcase"
            data-nav-key="showcase"
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              transition: 'color 0.25s ease',
              color: isShowcaseActive ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <span>🎨</span> UI Showcase
          </Link>
        )}
      </div>

      {/* Pending Sign-Up Notification Banner directly above ⚙️ Admin | 👥 Users */}
      <div style={{ marginTop: 'auto' }}>
        <PendingApprovalsReminder profile={profile} />
      </div>

      {/* SPOCs Master & Logs Links directly above Admin & Users (Super Admin only) */}
      {canAccessSpoc && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.35rem' }}>
          <Link
            href="/home/spocs"
            style={{
              width: '100%',
              padding: '0.5rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              background: isSpocActive ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(148, 163, 184, 0.12)',
              color: isSpocActive ? '#ffffff' : 'var(--text-secondary)',
              border: isSpocActive ? 'none' : '1px solid var(--border-color)',
              boxShadow: isSpocActive ? '0 4px 14px rgba(245, 158, 11, 0.35)' : 'none',
              transition: 'all 0.25s ease',
              boxSizing: 'border-box'
            }}
          >
            <span>👥</span> SPOCs
          </Link>
          <Link
            href="/home/logs"
            style={{
              width: '100%',
              padding: '0.5rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              borderRadius: '10px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              background: isLogsActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(148, 163, 184, 0.12)',
              color: isLogsActive ? '#ffffff' : 'var(--text-secondary)',
              border: isLogsActive ? 'none' : '1px solid var(--border-color)',
              boxShadow: isLogsActive ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
              transition: 'all 0.25s ease',
              boxSizing: 'border-box'
            }}
          >
            <span>📊</span> Logs
          </Link>
        </div>
      )}

      {/* Admin & Users segmented toggle bar directly above Sync ERP */}
      {profile?.is_super_admin === true && (
        <div style={{ marginBottom: '0.15rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '4px',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}>
            {/* ── Sliding Active Glider Pill for Admin / Users ── */}
            <div style={{
              position: 'absolute',
              top: '4px',
              bottom: '4px',
              left: '4px',
              width: 'calc(50% - 4px)',
              borderRadius: '8px',
              background: pathname === '/home/users'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : pathname === '/home/admin'
                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                : 'transparent',
              boxShadow: pathname === '/home/users'
                ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                : pathname === '/home/admin'
                ? '0 4px 14px rgba(59, 130, 246, 0.35)'
                : 'none',
              transform: pathname === '/home/users' ? 'translateX(100%)' : 'translateX(0%)',
              opacity: (pathname === '/home/admin' || pathname === '/home/users') ? 1 : 0,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, boxShadow 0.3s ease, opacity 0.2s ease',
              pointerEvents: 'none',
              zIndex: 1
            }} />

            <Link
              href="/home/admin"
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.45rem 0.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                textDecoration: 'none',
                position: 'relative',
                zIndex: 2,
                transition: 'color 0.25s ease',
                color: pathname === '/home/admin' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <span>⚙️</span> Admin
            </Link>
            <Link
              href="/home/users"
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.45rem 0.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                textDecoration: 'none',
                position: 'relative',
                zIndex: 2,
                transition: 'color 0.25s ease',
                color: pathname === '/home/users' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <span>👥</span> Users
            </Link>
          </div>
        </div>
      )}

    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isJobPage = pathname.startsWith('/home/job/');
  const isUnbilledPage = pathname === '/home/unbilled';
  const showSidebar = !isJobPage && !isUnbilledPage;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        
        // Fetch full profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (userProfile) {
          // If user was disabled or approval revoked, force sign out immediately
          if (userProfile.is_approved === false) {
            await supabase.auth.signOut();
            router.push('/login');
            return;
          }
          setProfile(userProfile);
          setRole(userProfile.role);
        } else {
          // Profile deleted
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }
        
        setLoading(false);
      }
    };
    
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Real-time listener for current user's profile status (instant logout if disabled)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload: any) => {
          const updated = payload.new;
          if (updated) {
            if (updated.is_approved === false) {
              showToast('⛔ Your account has been deactivated. Logging out...', 'error');
              await supabase.auth.signOut();
              router.push('/login');
              return;
            }
            setProfile(updated);
            if (updated.role) setRole(updated.role);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async () => {
          showToast('⛔ Your account has been removed. Logging out...', 'error');
          await supabase.auth.signOut();
          router.push('/login');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, router]);

  if (loading) {
    return <div className={styles.loadingScreen}>Loading...</div>;
  }

  return (
    <PermissionsProvider>
      <div className="app-container">
        {showSidebar && (
          <aside className={`glass ${styles.sidebar}`} style={{ display: 'flex', flexDirection: 'column', padding: 0, zIndex: 50, height: '100vh', position: 'sticky', top: 0 }}>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', flexShrink: 0 }}>
                <ProfilePopup user={user} />
                <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(45deg, #059669, #10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: '-0.02em' }}>Jobs Portal</h2>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px', display: 'flex', flexDirection: 'column' }}>
                <Suspense fallback={<nav className={styles.nav}>Loading...</nav>}>
                  <DashboardNav profile={profile} user={user} />
                </Suspense>
              </div>
              
              <div style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                <SyncERPWrapper user={user} profile={profile} />
              </div>
            </div>
          </aside>
        )}
        <main className="main-content" style={isUnbilledPage ? { padding: '0.5rem' } : undefined}>
          {children}
        </main>
        <CommandPalette />
        {!isUnbilledPage && <AIChatbot />}
        <GlobalDialogs />
      </div>
    </PermissionsProvider>
  );
}

function SyncERPWrapper({ user, profile }: { user: any, profile: any }) {
  const cscRole = profile?.csc_access || profile?.csc_role || 'None';
  const fRole = (profile?.followups_access || profile?.followups_role || profile?.tracking_role || '').toLowerCase();
  const hasFollowups = fRole === 'self' || fRole === 'all' || fRole.includes('self') || fRole.includes('all');
  const hasCscAccess = cscRole !== 'None' && cscRole !== '';

  if (!hasCscAccess && !hasFollowups) return null;
  return <SyncERPButton user={user} profile={profile} />;
}
