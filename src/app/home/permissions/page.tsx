'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/GlobalDialogs';

const ROLES = ['Admin', 'Manager', 'Executive', 'Viewer'];
const UI_TABS = ['Pages', 'Features'];
const UI_TAB_SECTIONS: Record<string, { section: string; category: string }[]> = {
  'Pages': [
    { section: 'Active Jobs', category: 'CSC' },
    { section: 'Closed Jobs', category: 'CSC' },
    { section: 'All Jobs', category: 'CSC' },
    { section: 'Follow-ups', category: 'CSC' },
    { section: 'Reports', category: 'CSC' },
    { section: 'Unbilled', category: 'Unbilled' },
    { section: 'Activity Log', category: 'CSC' }
  ],
  'Features': [
    { section: 'Sync ERP', category: 'CSC' },
    { section: 'CSC Call Alerts', category: 'CSC' },
    { section: 'Export Jobs', category: 'CSC' },
    { section: 'Unbilled Followup', category: 'Unbilled' },
    { section: 'Export Unbilled', category: 'Unbilled' }
  ]
};

const ALL_SECTIONS = [...UI_TAB_SECTIONS['Pages'], ...UI_TAB_SECTIONS['Features']];

const ACCESS_LEVELS = ['None', 'View', 'Edit'];

const TAB_ICONS: Record<string, string> = {
  Pages: '📄',
  Features: '✨',
};

const ACCESS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  None:  { label: 'None',  bg: 'transparent',            color: 'var(--text-secondary)', border: '1px solid var(--border-color)' },
  View:  { label: 'View',  bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa',               border: '1px solid rgba(59,130,246,0.4)' },
  Edit:  { label: 'Edit',  bg: 'rgba(16,185,129,0.15)',  color: '#34d399',               border: '1px solid rgba(16,185,129,0.4)' },
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin:     { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  Manager:   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  Executive: { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  Viewer:    { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
};

type MatrixCell = {
  id?: string;
  access: string;
};

// matrix[category][section][role] = { id?, access }
type Matrix = Record<string, Record<string, Record<string, MatrixCell>>>;

function buildMatrix(rows: any[]): Matrix {
  const matrix: Matrix = {};
  for (const { category, section } of ALL_SECTIONS) {
    if (!matrix[category]) matrix[category] = {};
    if (!matrix[category][section]) matrix[category][section] = {};
    for (const role of ROLES) {
      matrix[category][section][role] = { access: 'None' };
    }
  }
  for (const row of rows) {
    let { category, section, role, access, id } = row;
    if (access === 'Read') access = 'View';
    if (matrix[category]?.[section]?.[role] !== undefined) {
      matrix[category][section][role] = { id, access: access || 'None' };
    }
  }
  return matrix;
}

export default function PermissionsPage({ isEmbedded }: { isEmbedded?: boolean }) {
  const [matrix, setMatrix] = useState<Matrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('Pages');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles').select('role').eq('id', data.user.id).single()
          .then(({ data: profile }) => {
            if (profile && profile.role === 'Admin') {
              fetchPermissions();
            } else {
              window.location.href = '/home';
            }
          });
      } else {
        window.location.href = '/home';
      }
    });
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error) {
      showToast('Failed to load permissions', 'error');
    } else {
      setMatrix(buildMatrix(data || []));
    }
    setLoading(false);
  };

  const cycleAccess = (category: string, section: string, role: string) => {
    setMatrix(prev => {
      const current = prev[category]?.[section]?.[role]?.access || 'None';
      const idx = ACCESS_LEVELS.indexOf(current);
      // Fallback to None if not found
      const nextIdx = idx === -1 ? 1 : (idx + 1) % ACCESS_LEVELS.length;
      const nextAccess = ACCESS_LEVELS[nextIdx];
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [section]: {
            ...prev[category][section],
            [role]: { ...prev[category][section][role], access: nextAccess }
          }
        }
      };
    });
    setHasChanges(true);
  };

  const setAccess = (category: string, section: string, role: string, value: string) => {
    setMatrix(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [section]: {
          ...prev[category][section],
          [role]: { ...prev[category][section][role], access: value }
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const toUpdate: any[] = [];
    const toInsert: any[] = [];

    for (const { section: sec, category: cat } of ALL_SECTIONS) {
      for (const role of ROLES) {
        const cell = matrix[cat]?.[sec]?.[role];
        if (cell?.id) {
          toUpdate.push({ id: cell.id, category: cat, section: sec, role, access: cell.access });
        } else if (cell?.access && cell.access !== 'None') {
          toInsert.push({ category: cat, section: sec, role, access: cell.access });
        }
      }
    }

    let saveError = null;

    if (toUpdate.length > 0) {
      const { error } = await supabase.from('role_permissions').upsert(toUpdate);
      if (error) saveError = error;
    }
    
    if (toInsert.length > 0 && !saveError) {
      const { error } = await supabase.from('role_permissions').insert(toInsert);
      if (error) saveError = error;
    }

    if (saveError) {
      showToast('Error saving permissions: ' + (saveError.message || JSON.stringify(saveError)), 'error');
      console.error('Supabase Bulk Save Error:', saveError);
    } else {
      showToast('Permissions saved successfully!', 'success');
      setHasChanges(false);
      fetchPermissions();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--border-color)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading Access Matrix...
      </div>
    );
  }

  const sections = UI_TAB_SECTIONS[activeTab] || [];

  return (
    <div style={{ padding: isEmbedded ? '0' : '2rem', maxWidth: isEmbedded ? '100%' : '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: isEmbedded ? '1.25rem' : '1.8rem', fontWeight: 800, color: '#3b82f6', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          🛡️ 1. Role Permissions Matrix
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {saving && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--border-color)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Saving...
            </span>
          )}
          {hasChanges && !saving && (
            <button
              onClick={handleSave}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
                transition: 'all 0.2s',
              }}
            >
              Save Changes
            </button>
          )}
        </div>
      </div>



      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {UI_TABS.map(tab => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.65rem 1.4rem',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                borderRadius: '8px 8px 0 0',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
                position: 'relative',
                bottom: '-2px',
                boxShadow: isActive ? '0 -3px 10px rgba(99,102,241,0.2)' : 'none',
              }}
            >
              {TAB_ICONS[tab]} {tab}
            </button>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <div style={{ background: 'var(--surface-color)', borderRadius: '0 12px 12px 12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {/* Matrix Header Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px repeat(4, 1fr)',
          background: 'rgba(99,102,241,0.08)',
          borderBottom: '2px solid var(--border-color)',
        }}>
          <div style={{ padding: '0.9rem 1.2rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Page / Section
          </div>
          {ROLES.map(role => {
            const rc = ROLE_COLORS[role];
            return (
              <div key={role} style={{ padding: '0.9rem 0.5rem', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: rc.bg,
                  color: rc.color,
                }}>
                  {role}
                </span>
              </div>
            );
          })}
        </div>

        {/* Matrix Body */}
        {sections.map(({ section, category }, sIdx) => (
          <div
            key={`${section}-${category}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '220px repeat(4, 1fr)',
              borderBottom: sIdx < sections.length - 1 ? '1px solid var(--border-color)' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Section Name */}
            <div style={{
              padding: '1rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              borderRight: '1px solid var(--border-color)',
            }}>
              {section}
            </div>

            {/* Role Cells */}
            {ROLES.map(role => {
              const cell = matrix[category]?.[section]?.[role];
              const access = cell?.access || 'None';
              const cfg = ACCESS_CONFIG[access];

              return (
                <div
                  key={role}
                  style={{ padding: '0.9rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {/* Access pill — click cycles; right-click opens a quick picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => cycleAccess(category, section, role)}
                      title="Click to cycle access level"
                      style={{
                        padding: '0.35rem 1rem',
                        borderRadius: '20px',
                        border: cfg.border,
                        background: cfg.bg,
                        color: cfg.color,
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        minWidth: 64,
                      }}
                    >
                      {access}
                    </button>
                    {/* Segmented mini buttons */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {ACCESS_LEVELS.map(lvl => {
                        const lc = ACCESS_CONFIG[lvl];
                        const isSelected = access === lvl;
                        return (
                          <button
                            key={lvl}
                            onClick={() => setAccess(category, section, role, lvl)}
                            title={lvl}
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              border: isSelected ? `2px solid ${lc.color}` : '1px solid var(--border-color)',
                              background: isSelected ? lc.color : 'transparent',
                              cursor: 'pointer',
                              padding: 0,
                              transition: 'all 0.15s',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
