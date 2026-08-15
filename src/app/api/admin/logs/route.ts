import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '150', 10);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    // 1. Fetch recent login logs
    let loginLogs: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('login_logs')
        .select('*')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        loginLogs = data;
      }
    } catch (e) {
      console.warn('[admin/logs] login_logs query warning:', e);
    }

    // 2. Fetch usage/egress logs (exports, syncs)
    let usageLogs: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        usageLogs = data;
      }
    } catch (e) {
      console.warn('[admin/logs] usage_logs query warning:', e);
    }

    // 3. Fetch all profiles for user activity matrix
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, username, role, department, designation, branches, is_approved, last_login_at, last_login_ip, created_at');

    // 4. Fetch activity counts across core tables
    const [
      auditRes,
      jobLogsRes,
      commRes,
      whatsappRes,
      followupRes,
      jobsCountRes,
      legacyCountRes,
      loginCountRes
    ] = await Promise.all([
      // Audit logs (field edits)
      supabaseAdmin.from('audit_logs').select('username, name', { count: 'exact' }).limit(5000),
      // Job logs (job diffs)
      supabaseAdmin.from('job_logs').select('changed_by', { count: 'exact' }).limit(5000),
      // Communications
      supabaseAdmin.from('job_communications').select('created_by', { count: 'exact' }).limit(5000),
      // WhatsApp logs
      supabaseAdmin.from('whatsapp_logs').select('sent_by', { count: 'exact' }).limit(5000),
      // Unbilled followups
      supabaseAdmin.from('unbilled_followups').select('agent_name', { count: 'exact' }).limit(5000),
      // Table record counts
      supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('legacy_jobs').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('login_logs').select('*', { count: 'exact', head: true }),
    ]);

    // Aggregate activity by user
    const userActivityMap: Record<string, {
      fieldEdits: number;
      jobUpdates: number;
      communications: number;
      whatsappSent: number;
      unbilledFollowups: number;
    }> = {};

    const normalizeUser = (str: string | null) => (str || '').trim().toLowerCase();

    const getOrCreate = (key: string) => {
      const nKey = normalizeUser(key);
      if (!nKey) return null;
      if (!userActivityMap[nKey]) {
        userActivityMap[nKey] = { fieldEdits: 0, jobUpdates: 0, communications: 0, whatsappSent: 0, unbilledFollowups: 0 };
      }
      return userActivityMap[nKey];
    };

    // Aggregate audit logs
    (auditRes.data || []).forEach(row => {
      const key = row.username || row.name;
      const target = getOrCreate(key);
      if (target) target.fieldEdits += 1;
    });

    // Aggregate job logs
    (jobLogsRes.data || []).forEach(row => {
      const target = getOrCreate(row.changed_by);
      if (target) target.jobUpdates += 1;
    });

    // Aggregate communications
    (commRes.data || []).forEach(row => {
      const target = getOrCreate(row.created_by);
      if (target) target.communications += 1;
    });

    // Aggregate whatsapp
    (whatsappRes.data || []).forEach(row => {
      const target = getOrCreate(row.sent_by);
      if (target) target.whatsappSent += 1;
    });

    // Aggregate unbilled followups
    (followupRes.data || []).forEach(row => {
      const target = getOrCreate(row.agent_name);
      if (target) target.unbilledFollowups += 1;
    });

    // Merge with profiles
    const userMatrix = (profiles || []).map(p => {
      const keyUser = normalizeUser(p.username);
      const keyName = normalizeUser(p.name);
      const act = userActivityMap[keyUser] || userActivityMap[keyName] || {
        fieldEdits: 0, jobUpdates: 0, communications: 0, whatsappSent: 0, unbilledFollowups: 0
      };

      const totalOperations = act.fieldEdits + act.jobUpdates + act.communications + act.whatsappSent + act.unbilledFollowups;

      return {
        id: p.id,
        name: p.name || p.username,
        username: p.username,
        role: p.role,
        department: p.department || p.designation || 'General',
        branches: p.branches || [],
        is_approved: p.is_approved !== false,
        last_login_at: p.last_login_at || null,
        last_login_ip: p.last_login_ip || null,
        created_at: p.created_at,
        activity: act,
        totalOperations
      };
    }).sort((a, b) => b.totalOperations - a.totalOperations);

    // Database Table Stats
    const tableStats = [
      { name: 'jobs (Active & Closed)', count: jobsCountRes.count ?? 0, estRowSizeBytes: 650, note: 'Core job records' },
      { name: 'legacy_jobs (Archive)', count: legacyCountRes.count ?? 0, estRowSizeBytes: 320, note: 'Archived ERP jobs' },
      { name: 'audit_logs', count: auditRes.count ?? 0, estRowSizeBytes: 240, note: 'Field edit history' },
      { name: 'job_logs', count: jobLogsRes.count ?? 0, estRowSizeBytes: 300, note: 'Job state changes diffs' },
      { name: 'job_communications', count: commRes.count ?? 0, estRowSizeBytes: 380, note: 'Customer call logs' },
      { name: 'whatsapp_logs', count: whatsappRes.count ?? 0, estRowSizeBytes: 280, note: 'WhatsApp message history' },
      { name: 'unbilled_followups', count: followupRes.count ?? 0, estRowSizeBytes: 260, note: 'Unbilled agent notes' },
      { name: 'profiles', count: profiles?.length ?? 0, estRowSizeBytes: 420, note: 'System users & access' },
      { name: 'login_logs', count: loginCountRes.count ?? loginLogs.length, estRowSizeBytes: 250, note: 'User access history' },
    ];

    const totalEstStorageBytes = tableStats.reduce((acc, t) => acc + (t.count * t.estRowSizeBytes), 0);

    // Calculate approximate monthly data egress estimation
    const estimatedDailyQueries = (auditRes.count || 0) * 2 + (loginLogs.length * 15) + (jobsCountRes.count || 0) * 0.1;
    const estimatedMonthlyEgressMB = Math.round(((estimatedDailyQueries * 30 * 2.5) / 1024) * 10) / 10;

    return NextResponse.json({
      loginLogs,
      usageLogs,
      userMatrix,
      tableStats,
      summary: {
        totalLogins: loginLogs.length,
        activeUsersToday: new Set(loginLogs.filter(l => {
          const d = new Date(l.created_at);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).map(l => l.username)).size,
        failedLoginsToday: loginLogs.filter(l => {
          const d = new Date(l.created_at);
          const today = new Date();
          return d.toDateString() === today.toDateString() && l.status !== 'success';
        }).length,
        totalEstStorageMB: (totalEstStorageBytes / (1024 * 1024)).toFixed(2),
        estimatedMonthlyEgressMB,
        supabaseFreeTierQuotaMB: 5120, // 5GB in MB
      }
    });

  } catch (error: any) {
    console.error('[GET /api/admin/logs] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
