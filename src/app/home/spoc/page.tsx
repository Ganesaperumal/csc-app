'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

const BRANCHES = ['BLR', 'DEL', 'BOM', 'MAA', 'HYD', 'PNQ', 'AMD', 'COK', 'KOL', 'OSS'];

interface SpocRule {
  id: number;
  company_name: string;
  aliases: string[];
  branch: string | null;
  sales_spoc: string | null;
  unbilled_spoc: string | null;
  is_private_rule: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = (): Partial<SpocRule> => ({
  company_name: '',
  aliases: [],
  branch: null,
  sales_spoc: '',
  unbilled_spoc: '',
  is_private_rule: false,
});

export default function SpocMasterPage() {
  const router = useRouter();
  const [rules, setRules] = useState<SpocRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [preview, setPreview] = useState<{ wouldUpdate: number; totalJobsWithEmptySPOC: number; unmappedCompanies: string[] } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<SpocRule>>(emptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [search, setSearch] = useState('');

  const loadRules = useCallback(async () => {
    const { data, error } = await supabase.from('spoc').select('*').order('company_name');
    if (!error && data) setRules(data);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('spoc_access, is_super_admin').eq('id', user.id).single();
      if (!profile) { router.push('/home'); return; }

      const access = profile.spoc_access || 'None';
      if (access === 'None' && !profile.is_super_admin) {
        showToast('⛔ Access Denied: You do not have access to SPOC Master.', 'error');
        router.push('/home');
        return;
      }
      setCanEdit(access === 'Edit' || profile.is_super_admin === true);
      await loadRules();
      setLoading(false);
    };
    init();
  }, [router, loadRules]);

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/sync-spocs', { method: 'GET' });
      const data = await res.json();
      setPreview(data);
    } catch { showToast('Failed to load preview.', 'error'); }
    setPreviewLoading(false);
  };

  useEffect(() => { if (!loading) loadPreview(); }, [loading]);

  const handleSync = async () => {
    if (!canEdit) return;
    const count = preview?.wouldUpdate ?? '?';
    const ok = await customConfirm(
      `This will fill SPOC fields in ${count} job(s) from the master rules.\n\nManually entered SPOC values will NEVER be overwritten.\n\nProceed?`
    );
    if (!ok) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-spocs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast(`✅ Synced ${data.updated} job(s). ${data.unmappedCompanies?.length || 0} companies without rules.`, 'success');
      await loadPreview();
    } catch (err: any) { showToast(err.message || 'Sync failed.', 'error'); }
    setSyncing(false);
  };

  const openAdd = () => {
    setEditRule(emptyForm());
    setAliasInput('');
    setIsEditing(false);
    setShowModal(true);
  };

  const openEdit = (rule: SpocRule) => {
    setEditRule({ ...rule });
    setAliasInput('');
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editRule.company_name?.trim()) { showToast('Company name is required.', 'error'); return; }
    setSaving(true);
    const payload = {
      company_name: editRule.company_name!.trim(),
      aliases: editRule.aliases || [],
      branch: editRule.is_private_rule ? (editRule.branch || null) : null,
      sales_spoc: editRule.sales_spoc?.trim() || null,
      unbilled_spoc: editRule.unbilled_spoc?.trim() || null,
      is_private_rule: !!editRule.is_private_rule,
      updated_at: new Date().toISOString(),
    };

    if (isEditing && editRule.id) {
      const { error } = await supabase.from('spoc').update(payload).eq('id', editRule.id);
      if (error) { showToast('Failed to update rule: ' + error.message, 'error'); }
      else { showToast('Rule updated.', 'success'); }
    } else {
      const { error } = await supabase.from('spoc').insert(payload);
      if (error) { showToast('Failed to add rule: ' + error.message, 'error'); }
      else { showToast('Rule added.', 'success'); }
    }
    setSaving(false);
    setShowModal(false);
    await loadRules();
    await loadPreview();
  };

  const handleDelete = async (id: number) => {
    const ok = await customConfirm('Delete this SPOC rule?');
    if (!ok) return;
    const { error } = await supabase.from('spoc').delete().eq('id', id);
    if (error) showToast('Failed to delete: ' + error.message, 'error');
    else { showToast('Rule deleted.', 'success'); await loadRules(); await loadPreview(); }
  };

  const addAlias = () => {
    const a = aliasInput.trim();
    if (!a) return;
    const cur = editRule.aliases || [];
    if (!cur.includes(a)) setEditRule(r => ({ ...r, aliases: [...(r.aliases || []), a] }));
    setAliasInput('');
  };
  const removeAlias = (a: string) => setEditRule(r => ({ ...r, aliases: (r.aliases || []).filter(x => x !== a) }));

  const filtered = rules.filter(r =>
    !search.trim() ||
    r.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.sales_spoc || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.unbilled_spoc || '').toLowerCase().includes(search.toLowerCase())
  );

  const corporateRules = filtered.filter(r => !r.is_private_rule);
  const privateRules = filtered.filter(r => r.is_private_rule);
  const unmapped = preview?.unmappedCompanies || [];

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>🤝 SPOC Master</h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            One entry per company auto-fills Sales &amp; Unbilled SPOCs across all job rows.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canEdit && (
            <>
              <button onClick={openAdd} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                + Add Rule
              </button>
              <button onClick={handleSync} disabled={syncing} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', background: syncing ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: syncing ? 'not-allowed' : 'pointer' }}>
                {syncing ? 'Syncing…' : '⚡ Sync SPOCs'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Rules', value: rules.length, color: '#4f46e5', bg: 'rgba(79,70,229,0.08)' },
          { label: 'Corporate', value: rules.filter(r => !r.is_private_rule).length, color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
          { label: 'PRIVATE Branch', value: rules.filter(r => r.is_private_rule).length, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
          { label: 'Jobs to Fill', value: previewLoading ? '…' : (preview?.wouldUpdate ?? '—'), color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Unmapped Companies', value: previewLoading ? '…' : unmapped.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        ].map(k => (
          <div key={k.label} className="glass" style={{ flex: '1 1 140px', padding: '1rem', borderRadius: '12px', background: k.bg, border: `1px solid ${k.color}25` }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{k.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Unmapped Companies Panel */}
      {unmapped.length > 0 && (
        <div className="glass" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.6rem' }}>
            ⚠️ {unmapped.length} company/branch rule(s) without a SPOC master entry — add rules for these:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {unmapped.slice(0, 50).map(c => (
              <span key={c} style={{ padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', cursor: canEdit ? 'pointer' : 'default' }}
                onClick={() => {
                  if (!canEdit) return;
                  const isPriv = c.startsWith('PRIVATE/');
                  setEditRule({ ...emptyForm(), company_name: isPriv ? 'PRIVATE' : c, is_private_rule: isPriv, branch: isPriv ? c.split('/')[1] : null });
                  setAliasInput('');
                  setIsEditing(false);
                  setShowModal(true);
                }}
              >
                {c}{canEdit ? ' +' : ''}
              </span>
            ))}
            {unmapped.length > 50 && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>+{unmapped.length - 50} more</span>}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search company, sales SPOC, or unbilled SPOC…"
          style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
        />
      </div>

      {/* Corporate Rules Table */}
      <RulesTable title="Corporate Companies" rules={corporateRules} canEdit={canEdit} onEdit={openEdit} onDelete={handleDelete} showBranch={false} />

      {/* PRIVATE Rules Table */}
      <RulesTable title="PRIVATE / Branch Rules" rules={privateRules} canEdit={canEdit} onEdit={openEdit} onDelete={handleDelete} showBranch={true} />

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="glass" style={{ background: 'var(--surface-color)', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '520px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 1.2rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {isEditing ? 'Edit SPOC Rule' : 'Add SPOC Rule'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Type toggle */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[{ label: 'Corporate', value: false }, { label: 'PRIVATE / Branch', value: true }].map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => setEditRule(r => ({ ...r, is_private_rule: opt.value, branch: opt.value ? (r.branch || 'BLR') : null }))}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', border: editRule.is_private_rule === opt.value ? 'none' : '1px solid var(--border-color)', background: editRule.is_private_rule === opt.value ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--bg-color)', color: editRule.is_private_rule === opt.value ? '#fff' : 'var(--text-secondary)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Company name */}
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input value={editRule.company_name || ''} onChange={e => setEditRule(r => ({ ...r, company_name: e.target.value }))}
                  placeholder={editRule.is_private_rule ? 'PRIVATE' : 'e.g. UltraTech Cements'}
                  style={inputStyle} />
              </div>

              {/* Branch (PRIVATE only) */}
              {editRule.is_private_rule && (
                <div>
                  <label style={labelStyle}>Branch *</label>
                  <select value={editRule.branch || ''} onChange={e => setEditRule(r => ({ ...r, branch: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">— Select Branch —</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              )}

              {/* Aliases (corporate only) */}
              {!editRule.is_private_rule && (
                <div>
                  <label style={labelStyle}>Aliases (optional — for fuzzy matching)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <input value={aliasInput} onChange={e => setAliasInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                      placeholder="e.g. UltraTech" style={{ ...inputStyle, flex: 1 }} />
                    <button type="button" onClick={addAlias} style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Add</button>
                  </div>
                  {(editRule.aliases || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(editRule.aliases || []).map(a => (
                        <span key={a} style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(79,70,229,0.1)', color: '#4f46e5', border: '1px solid rgba(79,70,229,0.2)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {a}
                          <span onClick={() => removeAlias(a)} style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 900 }}>×</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sales SPOC */}
              <div>
                <label style={labelStyle}>Sales SPOC (→ fills jobs.sales_by)</label>
                <input value={editRule.sales_spoc || ''} onChange={e => setEditRule(r => ({ ...r, sales_spoc: e.target.value }))}
                  placeholder="e.g. Shweta" style={inputStyle} />
              </div>

              {/* Unbilled SPOC */}
              <div>
                <label style={labelStyle}>Unbilled SPOC (→ fills jobs.spoc_name)</label>
                <input value={editRule.unbilled_spoc || ''} onChange={e => setEditRule(r => ({ ...r, unbilled_spoc: e.target.value }))}
                  placeholder="e.g. Prasanna" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.4rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', border: 'none', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.3rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' };

function RulesTable({ title, rules, canEdit, onEdit, onDelete, showBranch }: {
  title: string; rules: SpocRule[]; canEdit: boolean; onEdit: (r: SpocRule) => void; onDelete: (id: number) => void; showBranch: boolean;
}) {
  return (
    <div className="glass" style={{ borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        {title} <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>({rules.length})</span>
      </div>
      {rules.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>No rules yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                <th style={th}>Company</th>
                {!showBranch && <th style={th}>Aliases</th>}
                {showBranch && <th style={th}>Branch</th>}
                <th style={th}>Sales SPOC</th>
                <th style={th}>Unbilled SPOC</th>
                {canEdit && <th style={th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                  <td style={td}><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.company_name}</span></td>
                  {!showBranch && (
                    <td style={td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {(r.aliases || []).map(a => (
                          <span key={a} style={{ padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(79,70,229,0.08)', color: '#4f46e5', border: '1px solid rgba(79,70,229,0.15)' }}>{a}</span>
                        ))}
                        {(!r.aliases || r.aliases.length === 0) && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>}
                      </div>
                    </td>
                  )}
                  {showBranch && <td style={td}><span style={{ fontWeight: 700, color: '#d97706' }}>{r.branch || '—'}</span></td>}
                  <td style={td}><span style={{ color: r.sales_spoc ? '#10b981' : 'var(--text-secondary)' }}>{r.sales_spoc || '—'}</span></td>
                  <td style={td}><span style={{ color: r.unbilled_spoc ? '#3b82f6' : 'var(--text-secondary)' }}>{r.unbilled_spoc || '—'}</span></td>
                  {canEdit && (
                    <td style={td}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => onEdit(r)} style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(79,70,229,0.3)', background: 'rgba(79,70,229,0.08)', color: '#4f46e5', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => onDelete(r.id)} style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '0.6rem 1rem', verticalAlign: 'middle' };
