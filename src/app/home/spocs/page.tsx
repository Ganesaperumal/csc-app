'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast, customConfirm } from '@/components/GlobalDialogs';

const BRANCHES = ['BLR', 'DEL', 'BOM', 'MAA', 'HYD', 'PNQ', 'AMD', 'COK', 'KOL', 'OSS'];

export interface SpocRule {
  id: number;
  company_name: string;
  aliases: string[];
  branch: string | null;
  sales_spoc: string | null;
  unbilled_spoc: string | null;
  is_private_rule: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MatchedRulePreview {
  id: number;
  company_name: string;
  is_private_rule: boolean;
  branch: string | null;
  sales_spoc: string | null;
  unbilled_spoc: string | null;
  canFillSales: boolean;
  canFillUnbilled: boolean;
}

export interface JobNeedingFill {
  job_number: string;
  erp_job_id?: string | null;
  customer_name?: string | null;
  company?: string | null;
  branch?: string | null;
  sales_by?: string | null;
  spoc_name?: string | null;
  salesEmpty: boolean;
  unbilledEmpty: boolean;
  goods_track_status?: string | null;
  matchedRule: MatchedRulePreview | null;
}

export interface UnmappedCompanyItem {
  company: string;
  count: number;
  branch?: string;
  isPrivate: boolean;
}

export interface PreviewData {
  wouldUpdate: number;
  totalJobsWithEmptySPOC: number;
  unmappedCompanies: string[];
  unmappedWithCounts: UnmappedCompanyItem[];
  jobsNeedingFill: JobNeedingFill[];
}

const emptyForm = (): Partial<SpocRule> => ({
  company_name: '',
  aliases: [],
  branch: null,
  sales_spoc: '',
  unbilled_spoc: '',
  is_private_rule: false,
});

export default function SpocsHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [rules, setRules] = useState<SpocRule[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'autofill' | 'unmapped'>('rules');

  // Rule Filter & Search
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<'ALL' | 'CORPORATE' | 'PRIVATE'>('ALL');

  // Unmapped Companies Search
  const [unmappedSearch, setUnmappedSearch] = useState('');

  // Jobs Auto-Fill Inspector Filter & Selection
  const [jobSearch, setJobSearch] = useState('');
  const [jobFilterReadyOnly, setJobFilterReadyOnly] = useState(false);
  const [selectedJobNumbers, setSelectedJobNumbers] = useState<string[]>([]);
  const [syncingSingle, setSyncingSingle] = useState<Record<string, boolean>>({});
  const [syncingBulk, setSyncingBulk] = useState(false);
  const [syncingGlobal, setSyncingGlobal] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<Partial<SpocRule>>(emptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aliasInput, setAliasInput] = useState('');

  // Load Rules
  const loadRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('spoc')
        .select('*')
        .order('company_name');
      if (!error && data) {
        setRules(data);
      }
    } catch (e) {
      console.error('Error loading rules:', e);
    }
  }, []);

  // Load Preview & Unmapped Data
  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/sync-spocs', { method: 'GET' });
      const data = await res.json();
      if (!data.error) {
        setPreview(data);
      }
    } catch (e) {
      console.error('Error loading SPOC preview:', e);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // Auth & Access Guard
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_super_admin !== true) {
        showToast('⛔ Access Denied: SPOCs Hub is restricted to Super Admin only.', 'error');
        router.push('/home');
        return;
      }

      setCanEdit(true);
      await loadRules();
      await loadPreview();
      setLoading(false);
    };

    init();
  }, [router, loadRules, loadPreview]);

  // Global Full Auto-Fill Handler
  const handleGlobalSync = async () => {
    if (!canEdit) return;
    const count = preview?.wouldUpdate ?? 0;
    if (count === 0) {
      showToast('ℹ️ No pending jobs match existing master rules.', 'info');
      return;
    }

    const ok = await customConfirm(
      `⚡ Run SPOC Auto-Fill for all jobs?\n\nThis will populate empty Sales and Unbilled SPOC fields in ${count} matching job(s).\n\n⚠️ Existing manual entries are strictly protected and will NEVER be overwritten.`
    );
    if (!ok) return;

    setSyncingGlobal(true);
    try {
      const res = await fetch('/api/admin/sync-spocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`✅ ${data.message || `Successfully synced ${data.updated} job(s).`}`, 'success');
      await Promise.all([loadRules(), loadPreview()]);
    } catch (err: any) {
      showToast('Auto-Fill failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSyncingGlobal(false);
    }
  };

  // Single Job Auto-Fill Handler
  const handleSyncSingleJob = async (jobNumber: string) => {
    if (!canEdit) return;
    setSyncingSingle(prev => ({ ...prev, [jobNumber]: true }));
    try {
      const res = await fetch('/api/admin/sync-spocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_number: jobNumber }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.updated > 0) {
        showToast(`✅ Job #${jobNumber} auto-filled from master rule.`, 'success');
      } else {
        showToast(`ℹ️ Job #${jobNumber} has no empty fields or no rule matched.`, 'info');
      }
      await loadPreview();
    } catch (err: any) {
      showToast(`Failed to auto-fill Job #${jobNumber}: ` + err.message, 'error');
    } finally {
      setSyncingSingle(prev => ({ ...prev, [jobNumber]: false }));
    }
  };

  // Selected Jobs Batch Auto-Fill Handler
  const handleSyncSelectedJobs = async () => {
    if (!canEdit || selectedJobNumbers.length === 0) return;
    const ok = await customConfirm(
      `Auto-fill SPOC fields for ${selectedJobNumbers.length} selected job(s)?\n\nManual entries are strictly protected.`
    );
    if (!ok) return;

    setSyncingBulk(true);
    try {
      const res = await fetch('/api/admin/sync-spocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_numbers: selectedJobNumbers }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`✅ Auto-filled ${data.updated} of ${selectedJobNumbers.length} selected job(s).`, 'success');
      setSelectedJobNumbers([]);
      await loadPreview();
    } catch (err: any) {
      showToast('Batch auto-fill failed: ' + err.message, 'error');
    } finally {
      setSyncingBulk(false);
    }
  };

  // Modal Open Handlers
  const openAdd = (prefillCompany?: string, isPrivate?: boolean, branch?: string) => {
    setEditRule({
      ...emptyForm(),
      company_name: isPrivate ? 'PRIVATE' : (prefillCompany || ''),
      is_private_rule: !!isPrivate,
      branch: branch || (isPrivate ? 'BLR' : null),
    });
    setAliasInput('');
    setIsEditing(false);
    setShowModal(true);
  };

  const openEdit = (rule: SpocRule) => {
    setEditRule({ ...rule, aliases: rule.aliases || [] });
    setAliasInput('');
    setIsEditing(true);
    setShowModal(true);
  };

  // Save Rule Handler
  const handleSave = async () => {
    if (!editRule.company_name?.trim()) {
      showToast('Company name is required.', 'error');
      return;
    }
    if (editRule.is_private_rule && !editRule.branch) {
      showToast('Branch is required for PRIVATE rules.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      company_name: editRule.company_name.trim(),
      aliases: editRule.aliases || [],
      branch: editRule.is_private_rule ? (editRule.branch || null) : null,
      sales_spoc: editRule.sales_spoc?.trim() || null,
      unbilled_spoc: editRule.unbilled_spoc?.trim() || null,
      is_private_rule: !!editRule.is_private_rule,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing && editRule.id) {
        const { error } = await supabase.from('spoc').update(payload).eq('id', editRule.id);
        if (error) throw error;
        showToast('✅ SPOC rule updated successfully.', 'success');
      } else {
        const { error } = await supabase.from('spoc').insert(payload);
        if (error) throw error;
        showToast('✅ New SPOC rule added successfully.', 'success');
      }

      setShowModal(false);
      await Promise.all([loadRules(), loadPreview()]);
    } catch (err: any) {
      showToast('Failed to save rule: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Rule Handler
  const handleDelete = async (id: number, companyName: string) => {
    if (!canEdit) return;
    const ok = await customConfirm(`Are you sure you want to delete SPOC rule for "${companyName}"?`);
    if (!ok) return;

    try {
      const { error } = await supabase.from('spoc').delete().eq('id', id);
      if (error) throw error;
      showToast('Rule deleted.', 'success');
      await Promise.all([loadRules(), loadPreview()]);
    } catch (err: any) {
      showToast('Failed to delete rule: ' + err.message, 'error');
    }
  };

  // Alias Helper Functions
  const addAlias = () => {
    const a = aliasInput.trim();
    if (!a) return;
    const cur = editRule.aliases || [];
    if (!cur.some(item => item.toLowerCase() === a.toLowerCase())) {
      setEditRule(r => ({ ...r, aliases: [...(r.aliases || []), a] }));
    }
    setAliasInput('');
  };

  const removeAlias = (a: string) => {
    setEditRule(r => ({ ...r, aliases: (r.aliases || []).filter(x => x !== a) }));
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (ruleTypeFilter === 'CORPORATE' && r.is_private_rule) return false;
      if (ruleTypeFilter === 'PRIVATE' && !r.is_private_rule) return false;

      if (!ruleSearch.trim()) return true;
      const q = ruleSearch.toLowerCase().trim();
      const matchComp = r.company_name.toLowerCase().includes(q);
      const matchSales = (r.sales_spoc || '').toLowerCase().includes(q);
      const matchUnbilled = (r.unbilled_spoc || '').toLowerCase().includes(q);
      const matchBranch = (r.branch || '').toLowerCase().includes(q);
      const matchAliases = (r.aliases || []).some(a => a.toLowerCase().includes(q));

      return matchComp || matchSales || matchUnbilled || matchBranch || matchAliases;
    });
  }, [rules, ruleSearch, ruleTypeFilter]);

  const corporateRules = useMemo(() => filteredRules.filter(r => !r.is_private_rule), [filteredRules]);
  const privateRules = useMemo(() => filteredRules.filter(r => r.is_private_rule), [filteredRules]);

  // Filtered Unmapped Companies
  const filteredUnmapped = useMemo(() => {
    const list = preview?.unmappedWithCounts || [];
    if (!unmappedSearch.trim()) return list;
    const q = unmappedSearch.toLowerCase().trim();
    return list.filter(u => u.company.toLowerCase().includes(q) || (u.branch && u.branch.toLowerCase().includes(q)));
  }, [preview?.unmappedWithCounts, unmappedSearch]);

  // Filtered Jobs Needing Fill
  const filteredJobs = useMemo(() => {
    const list = preview?.jobsNeedingFill || [];
    return list.filter(j => {
      if (jobFilterReadyOnly && !j.matchedRule) return false;
      if (!jobSearch.trim()) return true;
      const q = jobSearch.toLowerCase().trim();
      const matchNum = j.job_number.toLowerCase().includes(q);
      const matchCust = (j.customer_name || '').toLowerCase().includes(q);
      const matchComp = (j.company || '').toLowerCase().includes(q);
      const matchBranch = (j.branch || '').toLowerCase().includes(q);
      return matchNum || matchCust || matchComp || matchBranch;
    });
  }, [preview?.jobsNeedingFill, jobSearch, jobFilterReadyOnly]);

  // Toggle selection for all filtered jobs
  const handleToggleSelectAll = () => {
    const jobsWithRules = filteredJobs.filter(j => !!j.matchedRule).map(j => j.job_number);
    if (selectedJobNumbers.length === jobsWithRules.length && jobsWithRules.length > 0) {
      setSelectedJobNumbers([]);
    } else {
      setSelectedJobNumbers(jobsWithRules);
    }
  };

  const handleToggleSelectJob = (num: string) => {
    setSelectedJobNumbers(prev =>
      prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num]
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>⏳</div>
        <div>Loading SPOCs Hub...</div>
      </div>
    );
  }

  const unmappedList = preview?.unmappedWithCounts || [];
  const wouldUpdateCount = preview?.wouldUpdate ?? 0;
  const totalEmptySpocJobs = preview?.totalJobsWithEmptySPOC ?? 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.75rem 1.5rem', color: 'var(--text-primary)' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1.2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem' }}>👥</span>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              SPOCs &amp; Auto-Fill Hub
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Centralized corporate master rules, private branch mappings, and automated job fill sync.
          </p>
        </div>

        {/* Global Header Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => { loadRules(); loadPreview(); }}
            disabled={previewLoading}
            title="Refresh rules and jobs statistics"
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: previewLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🔄</span> {previewLoading ? 'Refreshing…' : 'Refresh'}
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => openAdd()}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>+</span> Add SPOC Rule
              </button>

              <button
                onClick={handleGlobalSync}
                disabled={syncingGlobal || wouldUpdateCount === 0}
                title={wouldUpdateCount === 0 ? 'No jobs match pending rules' : `Auto-fill ${wouldUpdateCount} job(s)`}
                style={{
                  padding: '0.55rem 1.2rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: wouldUpdateCount > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border-color)',
                  color: wouldUpdateCount > 0 ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: (syncingGlobal || wouldUpdateCount === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: wouldUpdateCount > 0 ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>⚡</span>
                <span>{syncingGlobal ? 'Running Auto-Fill…' : `Run Full Auto-Fill (${wouldUpdateCount})`}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══ KPI Summary Ribbon ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.9rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Rules', value: rules.length, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', hint: `${rules.filter(r => !r.is_private_rule).length} Corp · ${rules.filter(r => r.is_private_rule).length} Private` },
          { label: 'Corporate Rules', value: rules.filter(r => !r.is_private_rule).length, color: '#0891b2', bg: 'rgba(8, 145, 178, 0.08)', hint: 'By company name & aliases' },
          { label: 'PRIVATE Rules', value: rules.filter(r => r.is_private_rule).length, color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)', hint: 'By customer branch code' },
          { label: 'Jobs to Auto-Fill', value: previewLoading ? '…' : wouldUpdateCount, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', hint: `of ${totalEmptySpocJobs} unassigned jobs` },
          { label: 'Unmapped Entities', value: previewLoading ? '…' : unmappedList.length, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', hint: 'Requires new rule' },
        ].map(k => (
          <div
            key={k.label}
            className="glass"
            style={{
              padding: '1rem 1.1rem',
              borderRadius: '14px',
              background: k.bg,
              border: `1px solid ${k.color}30`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                {k.label}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: k.color, lineHeight: 1.1 }}>
                {k.value}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.45rem', opacity: 0.85 }}>
              {k.hint}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Navigation Tabs ═══ */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { id: 'rules', label: '📋 SPOC Master Rules', count: rules.length },
          { id: 'autofill', label: '⚡ Auto-Fill & Jobs Inspector', count: preview?.jobsNeedingFill?.length ?? 0, badgeColor: wouldUpdateCount > 0 ? '#10b981' : undefined },
          { id: 'unmapped', label: '⚠️ Unmapped Companies Hub', count: unmappedList.length, badgeColor: unmappedList.length > 0 ? '#ef4444' : undefined },
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: isActive ? 'var(--surface-color)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderRadius: '10px 10px 0 0',
                borderBottom: isActive ? '3px solid #6366f1' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  style={{
                    padding: '0.1rem 0.45rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: t.badgeColor ? `${t.badgeColor}20` : 'rgba(148, 163, 184, 0.18)',
                    color: t.badgeColor || 'var(--text-secondary)',
                    border: t.badgeColor ? `1px solid ${t.badgeColor}40` : 'none',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: MASTER RULES                                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <div>
          {/* Controls bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Search */}
            <div style={{ flex: '1 1 280px', maxWidth: '400px' }}>
              <input
                value={ruleSearch}
                onChange={e => setRuleSearch(e.target.value)}
                placeholder="Search company, alias, sales SPOC, unbilled SPOC…"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(148, 163, 184, 0.12)', padding: '3px', borderRadius: '10px' }}>
              {[
                { id: 'ALL', label: `All (${rules.length})` },
                { id: 'CORPORATE', label: `Corporate (${rules.filter(r => !r.is_private_rule).length})` },
                { id: 'PRIVATE', label: `PRIVATE Branch (${rules.filter(r => r.is_private_rule).length})` },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setRuleTypeFilter(opt.id as any)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '7px',
                    border: 'none',
                    background: ruleTypeFilter === opt.id ? 'var(--surface-color)' : 'transparent',
                    color: ruleTypeFilter === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: ruleTypeFilter === opt.id ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: ruleTypeFilter === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Corporate Rules Table */}
          {(ruleTypeFilter === 'ALL' || ruleTypeFilter === 'CORPORATE') && (
            <div className="glass" style={{ borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', overflow: 'hidden' }}>
              <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🏢</span>
                  <span>Corporate Company Rules</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>({corporateRules.length})</span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => openAdd()}
                    style={{ padding: '0.25rem 0.65rem', borderRadius: '7px', border: '1px solid #4f46e550', background: 'rgba(79, 70, 229, 0.1)', color: '#6366f1', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    + Add Corporate Rule
                  </button>
                )}
              </div>

              {corporateRules.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No corporate rules match your filter.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(148, 163, 184, 0.08)' }}>
                        <th style={thStyle}>Company Name</th>
                        <th style={thStyle}>Aliases (Fuzzy Match)</th>
                        <th style={thStyle}>Sales SPOC</th>
                        <th style={thStyle}>Unbilled SPOC</th>
                        {canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {corporateRules.map((r, idx) => (
                        <tr
                          key={r.id}
                          style={{
                            borderTop: '1px solid var(--border-color)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.03)',
                          }}
                        >
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.company_name}</span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {(r.aliases || []).map(a => (
                                <span key={a} style={{ padding: '0.12rem 0.45rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                  {a}
                                </span>
                              ))}
                              {(!r.aliases || r.aliases.length === 0) && (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.6 }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {r.sales_spoc ? (
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                🎯 {r.sales_spoc}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {r.unbilled_spoc ? (
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                🧾 {r.unbilled_spoc}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>
                            )}
                          </td>
                          {canEdit && (
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => openEdit(r)}
                                  style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id, r.company_name)}
                                  style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
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
          )}

          {/* PRIVATE Branch Rules Table */}
          {(ruleTypeFilter === 'ALL' || ruleTypeFilter === 'PRIVATE') && (
            <div className="glass" style={{ borderRadius: '14px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', overflow: 'hidden' }}>
              <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🏠</span>
                  <span>PRIVATE / Individual Customer Branch Rules</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>({privateRules.length})</span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => openAdd('PRIVATE', true)}
                    style={{ padding: '0.25rem 0.65rem', borderRadius: '7px', border: '1px solid #d9770650', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    + Add Branch Rule
                  </button>
                )}
              </div>

              {privateRules.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No PRIVATE branch rules match your filter.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(148, 163, 184, 0.08)' }}>
                        <th style={thStyle}>Rule Target</th>
                        <th style={thStyle}>Assigned Branch</th>
                        <th style={thStyle}>Sales SPOC</th>
                        <th style={thStyle}>Unbilled SPOC</th>
                        {canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {privateRules.map((r, idx) => (
                        <tr
                          key={r.id}
                          style={{
                            borderTop: '1px solid var(--border-color)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.03)',
                          }}
                        >
                          <td style={tdStyle}>
                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                              PRIVATE CUSTOMER
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(148, 163, 184, 0.18)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                              📍 {r.branch || '—'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {r.sales_spoc ? (
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                🎯 {r.sales_spoc}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>
                            )}
                          </td>
                          <td style={tdStyle}>
                            {r.unbilled_spoc ? (
                              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                🧾 {r.unbilled_spoc}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>—</span>
                            )}
                          </td>
                          {canEdit && (
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => openEdit(r)}
                                  style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id, `PRIVATE/${r.branch}`)}
                                  style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                                >
                                  Delete
                                </button>
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
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: AUTO-FILL & JOBS INSPECTOR                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'autofill' && (
        <div>
          {/* Controls bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', flex: '1 1 300px', maxWidth: '500px', alignItems: 'center' }}>
              <input
                value={jobSearch}
                onChange={e => setJobSearch(e.target.value)}
                placeholder="Search job #, customer, company, branch…"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={jobFilterReadyOnly}
                  onChange={e => setJobFilterReadyOnly(e.target.checked)}
                />
                Match Ready Only
              </label>
            </div>

            {/* Batch actions */}
            {canEdit && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedJobNumbers.length > 0 && (
                  <button
                    onClick={handleSyncSelectedJobs}
                    disabled={syncingBulk}
                    style={{
                      padding: '0.5rem 0.9rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: syncingBulk ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {syncingBulk ? 'Auto-Filling…' : `⚡ Auto-Fill Selected (${selectedJobNumbers.length})`}
                  </button>
                )}
                <button
                  onClick={handleGlobalSync}
                  disabled={syncingGlobal || wouldUpdateCount === 0}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: (syncingGlobal || wouldUpdateCount === 0) ? 'not-allowed' : 'pointer',
                  }}
                >
                  ⚡ Auto-Fill All Ready ({wouldUpdateCount})
                </button>
              </div>
            )}
          </div>

          {/* Jobs Needing Fill Table */}
          <div className="glass" style={{ borderRadius: '14px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 800, fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎯</span>
                <span>Jobs with Missing SPOC Fields</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  (Showing {filteredJobs.length} of {totalEmptySpocJobs} unassigned)
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                {filteredJobs.filter(j => !!j.matchedRule).length} jobs matched with rules
              </div>
            </div>

            {filteredJobs.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                🎉 Great job! No jobs currently need SPOC assignment or match your search criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(148, 163, 184, 0.08)' }}>
                      {canEdit && (
                        <th style={{ ...thStyle, width: '36px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedJobNumbers.length > 0 && selectedJobNumbers.length === filteredJobs.filter(j => !!j.matchedRule).length}
                            onChange={handleToggleSelectAll}
                            title="Select all ready jobs"
                          />
                        </th>
                      )}
                      <th style={thStyle}>Job Number</th>
                      <th style={thStyle}>Customer / Company</th>
                      <th style={thStyle}>Branch</th>
                      <th style={thStyle}>Current SPOC Values</th>
                      <th style={thStyle}>Matched Master Rule</th>
                      {canEdit && <th style={{ ...thStyle, textAlign: 'right' }}>Auto-Fill</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job, idx) => {
                      const hasRule = !!job.matchedRule;
                      const isSelected = selectedJobNumbers.includes(job.job_number);
                      const isSingleLoading = !!syncingSingle[job.job_number];

                      return (
                        <tr
                          key={job.job_number}
                          style={{
                            borderTop: '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.06)' : (idx % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.03)'),
                          }}
                        >
                          {canEdit && (
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {hasRule ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectJob(job.job_number)}
                                />
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.3 }}>—</span>
                              )}
                            </td>
                          )}
                          <td style={tdStyle}>
                            <Link
                              href={`/home/job/${job.job_number}`}
                              target="_blank"
                              style={{ fontWeight: 800, color: '#3b82f6', textDecoration: 'none' }}
                            >
                              #{job.job_number}
                            </Link>
                            {job.erp_job_id && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                ERP: {job.erp_job_id}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {job.customer_name || '—'}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              {job.company || '(Private Customer)'}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ padding: '0.12rem 0.45rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-primary)' }}>
                              {job.branch || '—'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.72rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Sales: </span>
                                {job.sales_by ? (
                                  <span style={{ fontWeight: 700, color: '#10b981' }}>{job.sales_by}</span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>Missing</span>
                                )}
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Unbilled: </span>
                                {job.spoc_name ? (
                                  <span style={{ fontWeight: 700, color: '#3b82f6' }}>{job.spoc_name}</span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontWeight: 700 }}>Missing</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {job.matchedRule ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    Match Found
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {job.matchedRule.is_private_rule ? `PRIVATE/${job.matchedRule.branch}` : job.matchedRule.company_name}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                  {job.matchedRule.canFillSales && (
                                    <span style={{ color: '#10b981', marginRight: '0.4rem' }}>
                                      → Sales: <b>{job.matchedRule.sales_spoc}</b>
                                    </span>
                                  )}
                                  {job.matchedRule.canFillUnbilled && (
                                    <span style={{ color: '#3b82f6' }}>
                                      → Unbilled: <b>{job.matchedRule.unbilled_spoc}</b>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                                  No Rule Matched
                                </span>
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      const isPriv = !job.company || job.company.toLowerCase() === 'private';
                                      openAdd(job.company || undefined, isPriv, job.branch || undefined);
                                    }}
                                    style={{
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      background: 'rgba(239, 68, 68, 0.08)',
                                      color: '#ef4444',
                                      fontWeight: 700,
                                      fontSize: '0.68rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    + Add Rule
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          {canEdit && (
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              {job.matchedRule ? (
                                <button
                                  onClick={() => handleSyncSingleJob(job.job_number)}
                                  disabled={isSingleLoading}
                                  style={{
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    cursor: isSingleLoading ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {isSingleLoading ? '…' : '⚡ Auto-Fill'}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', opacity: 0.5 }}>—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: UNMAPPED COMPANIES HUB                                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'unmapped' && (
        <div>
          {/* Controls bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ flex: '1 1 280px', maxWidth: '400px' }}>
              <input
                value={unmappedSearch}
                onChange={e => setUnmappedSearch(e.target.value)}
                placeholder="Search unmapped company or branch…"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Click <b>+ Add Rule</b> on any company to instantly map SPOCs.
            </div>
          </div>

          {/* Unmapped Grid */}
          {filteredUnmapped.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                All Companies &amp; Branches Are Mapped!
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                Every job with empty SPOC fields has a corresponding master rule.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.9rem' }}>
              {filteredUnmapped.map(u => (
                <div
                  key={u.company}
                  className="glass"
                  style={{
                    padding: '1.1rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    background: 'rgba(239, 68, 68, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {u.company}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {u.isPrivate ? `Private individual customer in branch ${u.branch || 'ALL'}` : 'Corporate Company'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.count} Job{u.count > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {canEdit && (
                      <button
                        onClick={() => openAdd(u.company, u.isPrivate, u.branch)}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>+</span> Create SPOC Rule
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT RULE MODAL                                                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="glass"
            style={{
              background: 'var(--surface-color)',
              borderRadius: '16px',
              padding: '1.6rem',
              width: '100%',
              maxWidth: '540px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.3rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEditing ? '✏️ Edit SPOC Master Rule' : '✨ Add New SPOC Master Rule'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Type Toggle */}
              <div>
                <label style={modalLabelStyle}>Rule Type</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { label: '🏢 Corporate Company', value: false },
                    { label: '🏠 PRIVATE / Branch Rule', value: true },
                  ].map(opt => {
                    const isSelected = editRule.is_private_rule === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() =>
                          setEditRule(r => ({
                            ...r,
                            is_private_rule: opt.value,
                            company_name: opt.value ? 'PRIVATE' : (r.company_name === 'PRIVATE' ? '' : (r.company_name || '')),
                            branch: opt.value ? (r.branch || 'BLR') : null,
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.8rem',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          border: isSelected ? 'none' : '1px solid var(--border-color)',
                          background: isSelected ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--bg-color)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Company Name (Corporate) */}
              {!editRule.is_private_rule && (
                <div>
                  <label style={modalLabelStyle}>Company Name *</label>
                  <input
                    value={editRule.company_name || ''}
                    onChange={e => setEditRule(r => ({ ...r, company_name: e.target.value }))}
                    placeholder="e.g. UltraTech Cements Ltd"
                    style={modalInputStyle}
                  />
                </div>
              )}

              {/* Branch (PRIVATE Only) */}
              {editRule.is_private_rule && (
                <div>
                  <label style={modalLabelStyle}>Branch *</label>
                  <select
                    value={editRule.branch || ''}
                    onChange={e => setEditRule(r => ({ ...r, branch: e.target.value }))}
                    style={{ ...modalInputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Select Branch —</option>
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    All private / individual customer jobs in this branch will automatically use these SPOCs.
                  </div>
                </div>
              )}

              {/* Aliases (Corporate Only) */}
              {!editRule.is_private_rule && (
                <div>
                  <label style={modalLabelStyle}>Company Aliases (Optional for fuzzy matching)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <input
                      value={aliasInput}
                      onChange={e => setAliasInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAlias();
                        }
                      }}
                      placeholder="e.g. UltraTech"
                      style={{ ...modalInputStyle, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={addAlias}
                      style={{
                        padding: '0.55rem 0.9rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#4f46e5',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {(editRule.aliases || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.3rem' }}>
                      {(editRule.aliases || []).map(a => (
                        <span
                          key={a}
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(79, 70, 229, 0.12)',
                            color: '#6366f1',
                            border: '1px solid rgba(79, 70, 229, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          {a}
                          <span
                            onClick={() => removeAlias(a)}
                            style={{ cursor: 'pointer', opacity: 0.7, fontWeight: 900, fontSize: '0.85rem' }}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sales SPOC */}
              <div>
                <label style={modalLabelStyle}>Sales SPOC (→ Fills jobs.sales_by)</label>
                <input
                  value={editRule.sales_spoc || ''}
                  onChange={e => setEditRule(r => ({ ...r, sales_spoc: e.target.value }))}
                  placeholder="e.g. Shweta"
                  style={modalInputStyle}
                />
              </div>

              {/* Unbilled SPOC */}
              <div>
                <label style={modalLabelStyle}>Unbilled SPOC (→ Fills jobs.spoc_name)</label>
                <input
                  value={editRule.unbilled_spoc || ''}
                  onChange={e => setEditRule(r => ({ ...r, unbilled_spoc: e.target.value }))}
                  placeholder="e.g. Prasanna"
                  style={modalInputStyle}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.6rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: saving ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: saving ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                {saving ? 'Saving…' : 'Save SPOC Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.7rem 1rem',
  textAlign: 'left',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
};

const modalLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '0.35rem',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-color)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
  outline: 'none',
};
