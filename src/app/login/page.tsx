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
          router.push('/spoc-portal');
        } else {
          router.push('/dashboard');
        }
      }
    };
    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    const primaryEmail = `${cleanInput}@transworldintl.com`;

    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: primaryEmail,
      password: cleanPassword,
    });

    // Fallback 1: Try phone number email format if input was username (e.g. spoc / 9876543210)
    if (authError && cleanPassword) {
      const phoneEmail = `${cleanPassword}@transworldintl.com`.toLowerCase();
      const fallback1 = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: cleanPassword,
      });
      if (!fallback1.error) {
        authError = null;
        authData = fallback1.data;
      }
    }

    // Fallback 2: Look up profile by username or name in profiles table to find matching auth email
    if (authError) {
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('username, id')
        .or(`username.ilike.${cleanInput},name.ilike.${cleanInput}`);

      if (matchedProfiles && matchedProfiles.length > 0) {
        for (const p of matchedProfiles) {
          if (p.username) {
            const profileEmail = `${p.username}@transworldintl.com`.toLowerCase();
            const fallback2 = await supabase.auth.signInWithPassword({
              email: profileEmail,
              password: cleanPassword,
            });
            if (!fallback2.error) {
              authError = null;
              authData = fallback2.data;
              break;
            }
          }
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
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'SPOC') {
          router.push('/spoc-portal');
          return;
        }
      }
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`glass ${styles.loginCard}`}>
        <div className={styles.loginHeader}>
          <h1>Welcome to CSC</h1>
          <p className="text-muted">Customer Service Center</p>
        </div>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input 
              id="username" 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="e.g. spoc"
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
        </form>
      </div>
    </div>
  );
}
