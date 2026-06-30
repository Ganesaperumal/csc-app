'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePopup({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const username = user?.email?.split('@')[0] || 'User';
  
  // Use profile data if available, fallback to user_metadata or defaults
  let rawRole = profile?.role || user?.user_metadata?.role || 'Executive';
  const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1); // Ensure capitalized like "Admin"
  const displayAvatar = avatar || profile?.photo || user?.user_metadata?.avatar_url || null;
  const displayName = fullName || profile?.name || user?.user_metadata?.full_name || username;

  useEffect(() => {
    // Fetch profile data
    if (user?.id) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data);
          setFullName(data.name || '');
          setAvatar(data.photo || null);
        }
      });
    }

    if (typeof window !== 'undefined') {
      setIsLightMode(document.body.classList.contains('light-theme'));
    }

    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsManageMode(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Simple resizing to keep base64 small
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          // Target max width/height of 150px
          const size = Math.min(img.width, img.height, 150);
          canvas.width = size;
          canvas.height = size;
          // Crop center
          const startX = img.width > img.height ? (img.width - img.height) / 2 : 0;
          const startY = img.height > img.width ? (img.height - img.width) / 2 : 0;
          ctx.drawImage(img, startX, startY, Math.min(img.width, img.height), Math.min(img.width, img.height), 0, 0, size, size);
          const base64Avatar = canvas.toDataURL('image/jpeg', 0.8);
          setAvatar(base64Avatar);
          // Auto-save the uploaded image to Supabase immediately (Auth + Profile table)
          supabase.auth.updateUser({
            data: { avatar_url: base64Avatar }
          });
          supabase.from('profiles').update({ photo: base64Avatar }).eq('id', user.id).then();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    
    // Create an object to hold auth updates dynamically
    const authUpdates: any = { data: { full_name: fullName, avatar_url: avatar } };
    if (newPassword.trim().length >= 6) {
      authUpdates.password = newPassword.trim();
    }

    // Update auth metadata
    const { error: authError } = await supabase.auth.updateUser(authUpdates);
    
    // Update profiles table
    const { error } = await supabase.from('profiles').update({
      name: fullName,
      photo: avatar
    }).eq('id', user.id);
    
    setLoading(false);
    if (!error && !authError) {
      setIsManageMode(false);
      setNewPassword(''); // clear it
      // Optional: router.refresh() if needed to propagate
    } else {
      alert("Error saving profile: " + (error?.message || authError?.message));
    }
  };

  const toggleTheme = () => {
    const isLight = document.body.classList.toggle('light-theme');
    setIsLightMode(isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  };

  const AvatarComponent = ({ size = 40 }) => (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                  background: 'linear-gradient(135deg, #f472b6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: size * 0.4 }}>
      {displayAvatar ? (
        <img src={displayAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        <span>{username[0].toUpperCase()}</span>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative' }} ref={popupRef}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        <AvatarComponent size={28} />
      </div>

      {/* Popup Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '50px', left: '0', width: '280px', zIndex: 9999,
          borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          
          <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>

          {!isManageMode ? (
            <>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <AvatarComponent size={140} />
              </label>
              <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Hi, {displayName}!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{role}</p>

              <button 
                onClick={() => setIsManageMode(true)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.5rem', width: '100%' }}
              >
                Manage your Profile
              </button>

              <button 
                onClick={toggleTheme}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isLightMode ? '🌙 Switch to Dark Mode' : '☀️ Switch to Light Mode'}
              </button>

              <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', marginBottom: '1rem' }}></div>

              {role === 'Admin' && (
                <Link href="/dashboard/admin" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                  👥 Manage Users
                </Link>
              )}

              <button 
                onClick={() => supabase.auth.signOut()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sign out
              </button>
            </>
          ) : (
            // Edit Mode
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Edit Profile</h3>
              
              <label style={{ cursor: 'pointer', marginBottom: '1.5rem' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <AvatarComponent size={140} />
              </label>

              <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Change Password (Optional)</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button 
                  onClick={() => setIsManageMode(false)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={loading}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#38bdf8', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
