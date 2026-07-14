'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: `${username.trim()}@transworldintl.com`.toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
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
              placeholder="e.g. admin"
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
