import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Normalise a string for comparison
const norm = (s: string) => (s || '').trim().toLowerCase();

// Determine if a job's company is a "PRIVATE" (personal / blank) customer
const isPrivateCompany = (company: string) => {
  const c = norm(company);
  return !c || c === 'private';
};

export async function POST(req: NextRequest) {
  try {
    // Optional: single job_number to sync just one job
    let singleJobNumber: string | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      singleJobNumber = body?.job_number || null;
    } catch {}

    // 1. Load all master SPOC rules
    const { data: rules, error: rulesErr } = await serviceSupabase
      .from('spoc')
      .select('*');

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return NextResponse.json({ updated: 0, total: 0, unmappedCompanies: [], message: 'No SPOC master rules found.' });
    }

    // 2. Load jobs needing fill (only jobs where at least one SPOC field is empty)
    let query = serviceSupabase
      .from('jobs')
      .select('job_number, company, branch, sales_by, spoc_name')
      .or('sales_by.is.null,spoc_name.is.null,sales_by.eq.,spoc_name.eq.');

    if (singleJobNumber) {
      query = query.eq('job_number', singleJobNumber);
    }

    const { data: jobs, error: jobsErr } = await query;
    if (jobsErr) throw jobsErr;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ updated: 0, total: 0, unmappedCompanies: [], message: 'No jobs with empty SPOC fields.' });
    }

    let updated = 0;
    const unmappedSet = new Set<string>();

    for (const job of jobs) {
      const company = (job.company || '').trim();
      const branch = (job.branch || '').trim().toUpperCase();

      let rule: any = null;

      if (isPrivateCompany(company)) {
        // PRIVATE: match branch-specific rule
        rule = rules.find(
          (r: any) => r.is_private_rule && r.branch?.toUpperCase() === branch
        );
        if (!rule) unmappedSet.add(`PRIVATE/${branch}`);
      } else {
        // Corporate: Step 1 — exact match (case-insensitive)
        rule = rules.find(
          (r: any) => !r.is_private_rule && norm(r.company_name) === norm(company)
        );

        // Step 2 — alias match
        if (!rule) {
          rule = rules.find((r: any) => {
            if (r.is_private_rule) return false;
            const aliases: string[] = r.aliases || [];
            return aliases.some(
              (alias: string) =>
                norm(company).includes(norm(alias)) ||
                norm(alias).includes(norm(company))
            );
          });
        }

        if (!rule) unmappedSet.add(company);
      }

      if (!rule) continue;

      // Field-level override: only fill EMPTY fields
      const salesEmpty = !job.sales_by || job.sales_by.trim() === '';
      const unbilledEmpty = !job.spoc_name || job.spoc_name.trim() === '';

      const patch: Record<string, string> = {};
      if (salesEmpty && rule.sales_spoc) patch['sales_by'] = rule.sales_spoc;
      if (unbilledEmpty && rule.unbilled_spoc) patch['spoc_name'] = rule.unbilled_spoc;

      if (Object.keys(patch).length > 0) {
        const { error: updateErr } = await serviceSupabase
          .from('jobs')
          .update(patch)
          .eq('job_number', job.job_number);

        if (!updateErr) updated++;
      }
    }

    return NextResponse.json({
      updated,
      total: jobs.length,
      unmappedCompanies: Array.from(unmappedSet).sort(),
      message: `Synced ${updated} job(s). ${unmappedSet.size} company/branch rule(s) not found in master.`,
    });

  } catch (err: any) {
    console.error('[sync-spocs]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// GET: preview — how many jobs would be touched, which companies are unmapped
export async function GET(req: NextRequest) {
  try {
    const { data: rules } = await serviceSupabase.from('spoc').select('*');
    const { data: jobs } = await serviceSupabase
      .from('jobs')
      .select('job_number, company, branch, sales_by, spoc_name')
      .or('sales_by.is.null,spoc_name.is.null,sales_by.eq.,spoc_name.eq.');

    if (!rules || !jobs) return NextResponse.json({ wouldUpdate: 0, unmappedCompanies: [] });

    let wouldUpdate = 0;
    const unmappedSet = new Set<string>();

    for (const job of jobs) {
      const company = (job.company || '').trim();
      const branch = (job.branch || '').trim().toUpperCase();
      let rule: any = null;

      if (isPrivateCompany(company)) {
        rule = rules.find((r: any) => r.is_private_rule && r.branch?.toUpperCase() === branch);
        if (!rule) unmappedSet.add(`PRIVATE/${branch}`);
      } else {
        rule = rules.find((r: any) => !r.is_private_rule && norm(r.company_name) === norm(company));
        if (!rule) rule = rules.find((r: any) => {
          if (r.is_private_rule) return false;
          return (r.aliases || []).some((a: string) => norm(company).includes(norm(a)) || norm(a).includes(norm(company)));
        });
        if (!rule) unmappedSet.add(company);
      }

      if (!rule) continue;
      const salesEmpty = !job.sales_by || job.sales_by.trim() === '';
      const unbilledEmpty = !job.spoc_name || job.spoc_name.trim() === '';
      if ((salesEmpty && rule.sales_spoc) || (unbilledEmpty && rule.unbilled_spoc)) wouldUpdate++;
    }

    return NextResponse.json({
      wouldUpdate,
      totalJobsWithEmptySPOC: jobs.length,
      unmappedCompanies: Array.from(unmappedSet).sort(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
