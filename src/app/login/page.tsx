'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import styles from './login.module.css';
import logo from '@/assets/logo.jpg';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'SPOC') {
          router.push('/home/tracking');
        } else {
          router.push('/home');
        }
      }
    };
    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanInput = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    let authData = null;
    let authError = null;

    // 1. Direct attempt: If user entered full email (e.g. user@domain.com)
    if (cleanInput.includes('@')) {
      const result = await supabase.auth.signInWithPassword({
        email: cleanInput,
        password: cleanPassword,
      });
      authData = result.data;
      authError = result.error;
    } else {
      // 2. Direct attempt: If user entered username, append default domain
      const primaryEmail = `${cleanInput}@transworldintl.com`;
      const result = await supabase.auth.signInWithPassword({
        email: primaryEmail,
        password: cleanPassword,
      });
      authData = result.data;
      authError = result.error;
    }

    // 3. Fallback: Search profiles table by username, phone, or name to find associated email
    if (authError) {
      let candidateEmails: string[] = [];

      try {
        const res = await fetch('/api/auth/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: cleanInput })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.emails && data.emails.length > 0) {
            candidateEmails = candidateEmails.concat(data.emails);
          }
        }
      } catch (err) {
        console.error('Failed to resolve email:', err);
      }

      for (const email of Array.from(new Set(candidateEmails))) {
        const fallback = await supabase.auth.signInWithPassword({
          email,
          password: cleanPassword,
        });
        if (!fallback.error) {
          authError = null;
          authData = fallback.data;
          break;
        }
      }
    }

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_approved')
          .eq('id', user.id)
          .single();

        if (profile && profile.is_approved === false) {
          await supabase.auth.signOut();
          setError('⏳ Account Pending Admin Approval. Please contact Super Admin.');
          setLoading(false);
          return;
        }

        if (profile?.role === 'SPOC') {
          router.push('/home/tracking');
          return;
        }
      }
      router.push('/home');
    }
  };

  return (
    <div className={styles.loginContainer}>

      {/* ── Left: Brand Panel ── */}
      <div className={styles.brandPanel}>
        <div className={styles.orb + ' ' + styles.orb1} />
        <div className={styles.orb + ' ' + styles.orb2} />
        <div className={styles.orb + ' ' + styles.orb3} />

        <div className={styles.brandContent}>
          <div className={styles.logoWrapper}>
            <Image
              src={logo}
              alt="TransWorld International Logo"
              className={styles.logoImage}
              priority
            />
          </div>

          <div className={styles.brandTagline}>
            <h2>Internal Jobs Portal</h2>
            <p>
              Manage logistics jobs, track shipments, and coordinate your team — all in one place.
            </p>
          </div>

          <div className={styles.brandStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>360°</span>
              <span className={styles.statLabel}>Job Tracking</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>Live</span>
              <span className={styles.statLabel}>Updates</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>AI</span>
              <span className={styles.statLabel}>Powered</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h1>Welcome back 👋</h1>
            <p>Sign in to your account to continue</p>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john or john@transworldintl.com"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? 'Authenticating...' : '→ Sign In'}
            </button>

            <div className={styles.divider}>
              <span>New to TI Portal?</span>
            </div>

            <button
              type="button"
              className={styles.signupButton}
              onClick={() => router.push('/signup')}
            >
              Create a New Account
            </button>

            <p className={styles.signupHint}>
              Your account will require admin approval before access is granted.
            </p>
          </form>
        </div>
      </div>

    </div>
  );
}
