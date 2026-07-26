'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
        Welcome to TI Jobs Portal
      </h1>
      {profile && (
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
          Hello, <strong>{profile.name || profile.username}</strong>! Please select a module from the sidebar to get started.
        </p>
      )}
      <div style={{ marginTop: '3rem', padding: '2rem', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Quick Tips</h2>
        <ul style={{ textAlign: 'left', listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          <li>Use the sidebar navigation to access your authorized modules.</li>
          <li>For job-specific queries, utilize the tracking modules.</li>
          <li>Ensure you follow standard operating procedures for data updates.</li>
        </ul>
      </div>
    </div>
  );
}
