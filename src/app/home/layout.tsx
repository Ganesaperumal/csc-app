'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PermissionsProvider, usePermissions } from '@/components/PermissionsContext';
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
  const searchParams = useSearchParams();

  const userEmail = (user?.email || profile?.email || (profile?.username ? `${profile.username}@transworldintl.com` : '')).toLowerCase();
  const isSuperAdmin = userEmail === 'gp@transworldintl.com' || profile?.username === 'gp' || profile?.username === 'ganesh' || profile?.name?.includes('Ganesaperumal');

  // ─── Read directly from profile columns (source of truth = User Directory) ───
  // CSC Jobs: csc_role = 'None'|'Viewer'(View)|'Executive'/'Manager'/'Admin'(Edit)
  const cscRole = profile?.csc_role || 'None';
  const canAccessCsc = isSuperAdmin || (cscRole !== 'None' && cscRole !== '');
  const cscAccessLevel: 'None' | 'View' | 'Edit' = isSuperAdmin || ['Admin', 'Branch Manager', 'Manager', 'Executive'].includes(cscRole) ? 'Edit' : cscRole === 'Viewer' ? 'View' : 'None';

  const canAccessActive = canAccessCsc;
  const canAccessClosed = canAccessCsc;
  const isActiveActive = pathname.startsWith('/home/active-jobs');
  const isClosedActive = pathname === '/home/closed-jobs';

  // Follow-Ups: tracking_role = 'None'|'Executive'(Self)|'Admin'(All)
  const trackingRole = profile?.tracking_role || 'None';
  const canAccessFollowUps = canAccessCsc && trackingRole !== 'None';

  // All Jobs: role = 'Viewer'|'Admin'|'None'/null
  const mainRole = profile?.role || 'None';
  const canAccessAllJobs = isSuperAdmin || (mainRole !== 'None' && mainRole !== '');

  // Unbilled: unbilled_role = 'None'|'Viewer'(View)|'Executive'/'Manager'/'Admin'(Edit)
  const unbilledRole = profile?.unbilled_role || 'None';
  const canAccessUnbilled = isSuperAdmin || (unbilledRole !== 'None' && unbilledRole !== '');

  // Reports: visible if any CSC or Unbilled access
  const canAccessReports = canAccessCsc || canAccessUnbilled;

  return (
    <nav className={styles.nav} style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', gap: '0.35rem' }}>
      
      {(canAccessActive || canAccessClosed) && (
        <div style={{ marginBottom: '0.4rem' }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            paddingLeft: '0.5rem',
            marginBottom: '0.4rem'
          }}>
            Jobs Status
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '4px',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            {canAccessActive && (
              <Link
                href="/home/active-jobs"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '0.45rem 0.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isActiveActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActiveActive
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'transparent',
                  boxShadow: isActiveActive ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
                }}
              >
                <span>⚡</span> Active
              </Link>
            )}
            {canAccessClosed && (
              <Link
                href="/home/closed-jobs"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '0.45rem 0.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isClosedActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isClosedActive
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                    : 'transparent',
                  boxShadow: isClosedActive ? '0 4px 12px rgba(79, 70, 229, 0.35)' : 'none',
                }}
              >
                <span>🗃️</span> Closed
              </Link>
            )}
          </div>
        </div>
      )}

      {canAccessFollowUps && (
        <Link href="/home/follow-ups" className={`${styles.navItem} ${pathname === '/home/follow-ups' ? styles.active : ''}`}>
          <span>⏰</span> Follow-ups
        </Link>
      )}

      {canAccessAllJobs && (
        <Link href="/home/all-jobs" className={`${styles.navItem} ${pathname === '/home/all-jobs' ? styles.active : ''}`}>
          <span>📁</span> All Jobs
        </Link>
      )}

      {canAccessUnbilled && (
        <Link href="/home/unbilled" className={`${styles.navItem} ${pathname.startsWith('/home/unbilled') ? styles.active : ''}`}>
          <span>🧾</span> Unbilled
        </Link>
      )}

      {canAccessReports && (
        <Link href="/home/reports" className={`${styles.navItem} ${pathname === '/home/reports' ? styles.active : ''}`}>
          <span>📊</span> Reports
        </Link>
      )}

      {/* Admin & Users segmented toggle bar directly above Sync ERP */}
      {isSuperAdmin && (
        <div style={{ marginTop: 'auto', marginBottom: '0.15rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(148, 163, 184, 0.12)',
            borderRadius: '12px',
            padding: '4px',
            position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <Link
              href="/home/admin"
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.45rem 0.25rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                color: pathname === '/home/admin' ? '#ffffff' : 'var(--text-secondary)',
                background: pathname === '/home/admin'
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : 'transparent',
                boxShadow: pathname === '/home/admin' ? '0 4px 12px rgba(59, 130, 246, 0.35)' : 'none',
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
                fontWeight: 600,
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                color: pathname === '/home/users' ? '#ffffff' : 'var(--text-secondary)',
                background: pathname === '/home/users'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'transparent',
                boxShadow: pathname === '/home/users' ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none',
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
  const isAllJobsPage = pathname === '/home/all-jobs';
  const isUnbilledPage = pathname === '/home/unbilled';
  const showSidebar = !isJobPage && !isAllJobsPage && !isUnbilledPage;

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
          setProfile(userProfile);
          setRole(userProfile.role);
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
        <PendingApprovalsReminder profile={profile} />
      </div>
    </PermissionsProvider>
  );
}

function SyncERPWrapper({ user, profile }: { user: any, profile: any }) {
  const isSuperAdmin = profile?.username === 'gp' || profile?.username === 'ganesh' || profile?.name?.includes('Ganesaperumal');
  const isAdmin = profile?.role === 'Admin';
  const cscRole = profile?.csc_role || '';
  const hasCscAccess = isSuperAdmin || isAdmin || (cscRole !== 'None' && cscRole !== '');
  if (!hasCscAccess) return null;
  return <SyncERPButton user={user} profile={profile} />;
}
