'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from './dashboard.module.css';
import GroupChat from './components/GroupChat';
import ProfilePopup from './components/ProfilePopup';
import SyncERPButton from './components/SyncERPButton';

function DashboardNav({ role }: { role: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'active';

  return (
    <nav className={styles.nav}>
      <Link href="/dashboard?view=active" className={`${styles.navItem} ${currentView === 'active' && pathname === '/dashboard' ? styles.active : ''}`}>
        Active Jobs
      </Link>
      <Link href="/dashboard/closed-jobs" className={`${styles.navItem} ${pathname === '/dashboard/closed-jobs' ? styles.active : ''}`}>
        Closed Jobs
      </Link>
      <Link href="/dashboard/spocs" className={`${styles.navItem} ${pathname === '/dashboard/spocs' ? styles.active : ''}`}>
        SPOC Management
      </Link>
      {role === 'Admin' && (
        <Link href="/dashboard/activity-log" className={`${styles.navItem} ${pathname === '/dashboard/activity-log' ? styles.active : ''}`}>
          Activity Log
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
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isJobPage = pathname.startsWith('/dashboard/job/');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        
        // Fetch role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          setRole(profile.role);
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
    
    // Theme initialization
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
      }
    }
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <div className={styles.loadingScreen}>Loading...</div>;
  }

  return (
    <div className="app-container">
      {!isJobPage && (
        <aside className={`glass ${styles.sidebar}`} style={{ display: 'flex', flexDirection: 'column', padding: 0, zIndex: 50, height: '100vh', position: 'sticky', top: 0 }}>
          
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'visible', minHeight: 0 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <ProfilePopup user={user} />
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 'bold', backgroundImage: 'linear-gradient(45deg, #059669, #10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: '-0.02em' }}>CSC Portal</h2>
            </div>

            <div>
              <Suspense fallback={<nav className={styles.nav}>Loading...</nav>}>
                <DashboardNav role={role} />
              </Suspense>
            </div>
            
            {/* Group Chat */}
            <div style={{ flex: 1, marginTop: '2rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
               <GroupChat user={user} />
            </div>

            <SyncERPButton user={user} />
          </div>
        </aside>
      )}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
