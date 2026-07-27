'use client';
import { showToast } from '@/components/GlobalDialogs';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/components/PermissionsContext';

export default function ProfilePopup({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url || null);
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();
  const popupRef = useRef<HTMLDivElement>(null);
  
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});


  const [profile, setProfile] = useState<any>(null);
  const { getAccessLevel } = usePermissions();

  useEffect(() => {
    if (isOpen && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      // The profile logo is at the top of the sidebar. We should always open downwards,
      // but ensure it doesn't overflow the bottom of the screen by adding a max-height and scroll.
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      
      setPopupStyle({
        position: 'absolute', 
        top: `${top}px`, 
        left: `${left}px`, 
        width: '260px', 
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        zIndex: 99999,
        borderRadius: '16px', 
        padding: '1.5rem', 
        boxShadow: 'var(--glass-shadow)',
        backgroundColor: 'var(--surface-color)', 
        backdropFilter: 'var(--glass-blur)', 
        border: '1px solid var(--border-color)',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center'
      });
    }
  }, [isOpen]);

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
          setPhone(data.phone || '');
        }
      });
    }

    if (typeof window !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark-theme'));
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (popupRef.current && !popupRef.current.contains(target) && !target.closest('.profile-popup-portal')) {
        setIsOpen(false);
        setIsManageMode(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('csc_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('csc_theme', 'light');
    }
  };

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

  const formatPhoneNumber = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.substring(2, 7)} ${digits.substring(7)}`;
    }
    return trimmed;
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    
    const formattedPhone = formatPhoneNumber(phone);
    
    // Create an object to hold auth updates dynamically
    const authUpdates: any = { data: { full_name: fullName, avatar_url: avatar, phone: formattedPhone } };
    if (newPassword.trim().length >= 6) {
      authUpdates.password = newPassword.trim();
    }

    // Update auth metadata
    const { error: authError } = await supabase.auth.updateUser(authUpdates);
    
    // Update profiles table
    const { error } = await supabase.from('profiles').update({
      name: fullName,
      photo: avatar,
      phone: formattedPhone
    }).eq('id', user.id);
    
    setLoading(false);
    if (!error && !authError) {
      setIsManageMode(false);
      setNewPassword(''); // clear it
      setPhone(formattedPhone);
      setProfile((prev: any) => prev ? { ...prev, phone: formattedPhone } : { phone: formattedPhone });
    } else {
      showToast("Error saving profile: " + (error?.message || authError?.message, 'error'));
    }
  };



  const AvatarComponent = ({ size = 40, showPencil = false }: { size?: number; showPencil?: boolean }) => (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                  background: 'linear-gradient(135deg, #f472b6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: size * 0.4 }}>
      {displayAvatar ? (
        <img src={displayAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        <span>{username[0].toUpperCase()}</span>
      )}
      {showPencil && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#4f46e5',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '2px solid white',
          fontSize: '14px'
        }}>
          ✏️
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative' }} ref={popupRef}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        <AvatarComponent size={42} />
      </div>

      {/* Popup Menu */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="profile-popup-portal" style={popupStyle}>
          
          <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>

          {!isManageMode ? (
            <>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <AvatarComponent size={140} />
              </label>
              <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{displayName}!</h3>
              {role && role !== 'Executive' && role !== 'Manager' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: profile?.phone ? '0.25rem' : '1.5rem' }}>{role}</p>
              )}
              {profile?.phone && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📞</span> <span>{profile.phone}</span>
                </p>
              )}

              <button 
                onClick={() => setIsManageMode(true)}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '0.5rem', width: '100%', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
              >
                Manage your Profile
              </button>



              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(148,163,184,0.1)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ position: 'relative' }}>
                    <input type="checkbox" style={{ display: 'none' }} checked={isDarkMode} onChange={toggleTheme} />
                    <div style={{ width: '42px', height: '22px', backgroundColor: isDarkMode ? '#4f46e5' : 'var(--border-color)', borderRadius: '99px', transition: 'background-color 0.2s' }}></div>
                    <div style={{ position: 'absolute', top: '3px', left: isDarkMode ? '23px' : '3px', width: '16px', height: '16px', backgroundColor: 'var(--bg-color)', borderRadius: '50%', transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                  </div>
                </label>
              </div>

              <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', marginBottom: '1rem' }}></div>

              {(getAccessLevel('User Management', profile) !== 'None' || getAccessLevel('Role Permissions', profile) !== 'None' || getAccessLevel('Admin Center', profile) !== 'None') && (
                <div style={{ width: '100%', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
                    Control Center
                  </div>
                  
                  {getAccessLevel('User Management', profile) !== 'None' && (
                    <Link href="/home/users" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>👥</span> User Management
                    </Link>
                  )}
                  
                  {getAccessLevel('Admin Center', profile) !== 'None' && (
                    <Link href="/home/admin" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚙️</span> Admin Center
                    </Link>
                  )}
                  
                  {getAccessLevel('Role Permissions', profile) !== 'None' && (
                    <Link href="/home/permissions" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🛡️</span> Role Permissions
                    </Link>
                  )}
                </div>
              )}

              <button 
                onClick={() => supabase.auth.signOut()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '8px', color: 'white', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', fontSize: '0.9rem' }}
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
                <AvatarComponent size={140} showPencil={true} />
              </label>

              <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
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
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
