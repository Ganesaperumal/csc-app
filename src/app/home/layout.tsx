'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from './home.module.css';
import GroupChat from './components/GroupChat';
import ProfilePopup from './components/ProfilePopup';
import SyncERPButton from './components/SyncERPButton';
import CommandPalette from './components/CommandPalette';
import AIChatbot from '../components/AIChatbot';
import GlobalDialogs from '@/components/GlobalDialogs';
import PendingApprovalsReminder from './components/PendingApprovalsReminder';

function DashboardNav({ profile }: { profile: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'active';
  const role = profile?.role;
  const cscRole = profile?.csc_role || 'Executive';
  const trackingRole = profile?.tracking_role || 'Executive';
  const unbilledRole = profile?.unbilled_role || 'Executive';
  const isSuperAdmin = role === 'Admin' || cscRole === 'Admin';

  return (
    <nav className={styles.nav}>
      
      {cscRole !== 'None' && (
        <>
          <Link href="/home/active-jobs" className={`${styles.navItem} ${pathname.startsWith('/home/active-jobs') ? styles.active : ''}`}>
            <span>📋</span> Active Jobs
          </Link>
          <Link href="/home/closed-jobs" className={`${styles.navItem} ${pathname === '/home/closed-jobs' ? styles.active : ''}`}>
            <span>🗃️</span> Closed Jobs
          </Link>
          <Link href="/home/all-jobs" className={`${styles.navItem} ${pathname === '/home/all-jobs' ? styles.active : ''}`}>
            <span>📁</span> All Jobs
          </Link>
          {cscRole !== 'Viewer' && (
            <Link href="/home/follow-ups" className={`${styles.navItem} ${pathname === '/home/follow-ups' ? styles.active : ''}`}>
              <span>⏰</span> Follow-ups
            </Link>
          )}
          <Link href="/home/reports" className={`${styles.navItem} ${pathname === '/home/reports' ? styles.active : ''}`}>
            <span>📊</span> Reports &amp; Analytics
          </Link>
        </>
      )}

      {unbilledRole !== 'None' && (
        <Link href="/home/unbilled" className={`${styles.navItem} ${pathname.startsWith('/home/unbilled') ? styles.active : ''}`}>
          <span>💰</span> Unbilled
        </Link>
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
          // No forced routing — everyone goes to Home
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

  // Second effect removed as routing is now handled by the Home page

  if (loading) {
    return <div className={styles.loadingScreen}>Loading...</div>;
  }

  return (
    <div className="app-container">
      {showSidebar && (
        <aside className={`glass ${styles.sidebar}`} style={{ display: 'flex', flexDirection: 'column', padding: 0, zIndex: 50, height: '100vh', position: 'sticky', top: 0 }}>
          
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'visible', minHeight: 0 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <ProfilePopup user={user} />
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(45deg, #059669, #10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: '-0.02em' }}>Jobs Portal</h2>
            </div>

            <div>
              <Suspense fallback={<nav className={styles.nav}>Loading...</nav>}>
                <DashboardNav profile={profile} />
              </Suspense>
            </div>
            
            {/* Group Chat - visible to Executive/Manager/Admin; hidden for Viewer */}
            {(profile?.csc_role === 'Admin' || profile?.csc_role === 'Manager' || profile?.csc_role === 'Executive') && (
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                 <GroupChat user={user} profile={profile} />
              </div>
            )}

            <div style={{ flex: 1 }}></div>

            <div style={{ marginTop: '1rem' }}>
              <SyncERPButton user={user} profile={profile} />
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
  );
}
