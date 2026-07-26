'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

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
      const candidateEmails: string[] = [];
      if (cleanInput === 'admin' || cleanInput === 'ganesh' || cleanInput === 'ganesaperumal') {
        candidateEmails.push('gp@transworldintl.com');
      }

      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('username, phone, id')
        .or(`username.ilike.${cleanInput},phone.ilike.${cleanInput},name.ilike.${cleanInput}`);

      if (matchedProfiles && matchedProfiles.length > 0) {
        for (const p of matchedProfiles) {
          if (p.username) {
            candidateEmails.push(`${p.username}@transworldintl.com`.toLowerCase());
            if (p.username === 'admin') {
              candidateEmails.push('gp@transworldintl.com');
            }
          }
        }
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
          setError('⏳ Account Pending Admin Approval. Please contact Super Admin Ganesaperumal.');
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
      <div className={`glass ${styles.loginCard}`}>
        <div className={styles.loginHeader}>
          <h1>Welcome to TI Jobs Portal</h1>
        </div>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username or Email Address</label>
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
          
          <button type="submit" className={`btn ${styles.loginButton}`} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Need an account? <a href="/signup" style={{ color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>Self-Register / Sign Up</a>
          </div>
        </form>
      </div>
    </div>
  );
}
