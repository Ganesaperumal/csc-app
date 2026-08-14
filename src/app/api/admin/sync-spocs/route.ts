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
  return !c || c === 'private' || c === 'self' || c === 'individual';
};

// Find matching rule for a job
function findMatchingRule(job: { company?: string | null; branch?: string | null }, rules: any[]) {
  const company = (job.company || '').trim();
  const branch = (job.branch || '').trim().toUpperCase();

  if (isPrivateCompany(company)) {
    // PRIVATE: match branch-specific rule
    return rules.find(
      (r: any) => r.is_private_rule && r.branch?.toUpperCase() === branch
    ) || null;
  }

  // Corporate: Step 1 — exact match (case-insensitive)
  let matched = rules.find(
    (r: any) => !r.is_private_rule && norm(r.company_name) === norm(company)
  );

  // Corporate: Step 2 — alias match
  if (!matched) {
    matched = rules.find((r: any) => {
      if (r.is_private_rule) return false;
      const aliases: string[] = r.aliases || [];
      return aliases.some(
        (alias: string) =>
          norm(company).includes(norm(alias)) ||
          norm(alias).includes(norm(company))
      );
    });
  }

  return matched || null;
}

export async function POST(req: NextRequest) {
  try {
    let singleJobNumber: string | null = null;
    let jobNumbersList: string[] | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.job_number) {
        singleJobNumber = String(body.job_number);
      }
      if (Array.isArray(body?.job_numbers) && body.job_numbers.length > 0) {
        jobNumbersList = body.job_numbers.map(String);
      }
    } catch {}

    // 1. Load all master SPOC rules
    const { data: rules, error: rulesErr } = await serviceSupabase
      .from('spoc')
      .select('*');

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return NextResponse.json({
        success: false,
        updated: 0,
        total: 0,
        unmappedCompanies: [],
        message: 'No SPOC master rules found. Please create rules first.',
      });
    }

    // 2. Load jobs needing fill (jobs where at least one SPOC field is empty)
    let query = serviceSupabase
      .from('jobs')
      .select('job_number, company, branch, sales_by, spoc_name, unbilled_spoc')
      .or('sales_by.is.null,spoc_name.is.null,sales_by.eq.,spoc_name.eq.');

    if (singleJobNumber) {
      query = query.eq('job_number', singleJobNumber);
    } else if (jobNumbersList && jobNumbersList.length > 0) {
      query = query.in('job_number', jobNumbersList);
    }

    const { data: jobs, error: jobsErr } = await query;
    if (jobsErr) throw jobsErr;

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        total: 0,
        unmappedCompanies: [],
        message: 'No matching jobs with empty SPOC fields were found.',
      });
    }

    let updated = 0;
    const unmappedSet = new Set<string>();
    const updatedDetails: Array<{ jobNumber: string; sales_by?: string; spoc_name?: string }> = [];

    for (const job of jobs) {
      const company = (job.company || '').trim();
      const branch = (job.branch || '').trim().toUpperCase();

      const rule = findMatchingRule(job, rules);

      if (!rule) {
        if (isPrivateCompany(company)) {
          unmappedSet.add(`PRIVATE/${branch || 'ALL'}`);
        } else {
          unmappedSet.add(company || 'Unknown');
        }
        continue;
      }

      // Field-level override protection: only fill EMPTY fields
      const salesEmpty = !job.sales_by || job.sales_by.trim() === '';
      const unbilledEmpty = !job.spoc_name || job.spoc_name.trim() === '';

      const patch: Record<string, string> = {};
      if (salesEmpty && rule.sales_spoc) {
        patch['sales_by'] = rule.sales_spoc;
      }
      if (unbilledEmpty && rule.unbilled_spoc) {
        patch['spoc_name'] = rule.unbilled_spoc;
        patch['unbilled_spoc'] = rule.unbilled_spoc;
      }

      if (Object.keys(patch).length > 0) {
        const { error: updateErr } = await serviceSupabase
          .from('jobs')
          .update(patch)
          .eq('job_number', job.job_number);

        if (!updateErr) {
          updated++;
          updatedDetails.push({
            jobNumber: job.job_number,
            sales_by: patch['sales_by'],
            spoc_name: patch['spoc_name'],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      total: jobs.length,
      unmappedCompanies: Array.from(unmappedSet).sort(),
      message: `Auto-filled SPOCs for ${updated} job(s) from master rules.`,
      updatedDetails,
    });
  } catch (err: any) {
    console.error('[sync-spocs POST]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// GET: preview — how many jobs would be touched, unmapped companies with frequency, and jobs needing fill
export async function GET(req: NextRequest) {
  try {
    const { data: rules, error: rulesErr } = await serviceSupabase.from('spoc').select('*').order('company_name');
    if (rulesErr) throw rulesErr;

    const { data: jobs, error: jobsErr } = await serviceSupabase
      .from('jobs')
      .select('job_number, enq_number, erp_job_id, customer_name, company, branch, sales_by, spoc_name, unbilled_spoc, goods_track_status, job_date')
      .or('sales_by.is.null,spoc_name.is.null,sales_by.eq.,spoc_name.eq.')
      .order('job_date', { ascending: false, nullsFirst: false });

    if (jobsErr) throw jobsErr;

    if (!rules || !jobs) {
      return NextResponse.json({
        wouldUpdate: 0,
        totalJobsWithEmptySPOC: 0,
        unmappedCompanies: [],
        unmappedWithCounts: [],
        jobsNeedingFill: [],
      });
    }

    let wouldUpdate = 0;
    const unmappedCounts: Record<string, { company: string; count: number; branch?: string; isPrivate: boolean }> = {};
    const jobsNeedingFill: Array<any> = [];

    for (const job of jobs) {
      const company = (job.company || '').trim();
      const branch = (job.branch || '').trim().toUpperCase();
      const isPriv = isPrivateCompany(company);

      const rule = findMatchingRule(job, rules);

      const salesEmpty = !job.sales_by || job.sales_by.trim() === '';
      const unbilledEmpty = !job.spoc_name || job.spoc_name.trim() === '';

      let canFillSales = false;
      let canFillUnbilled = false;

      if (rule) {
        if (salesEmpty && rule.sales_spoc) canFillSales = true;
        if (unbilledEmpty && rule.unbilled_spoc) canFillUnbilled = true;
        if (canFillSales || canFillUnbilled) {
          wouldUpdate++;
        }
      } else {
        const key = isPriv ? `PRIVATE/${branch || 'ALL'}` : (company || 'Unknown');
        if (!unmappedCounts[key]) {
          unmappedCounts[key] = {
            company: key,
            count: 0,
            branch: isPriv ? branch : undefined,
            isPrivate: isPriv,
          };
        }
        unmappedCounts[key].count++;
      }

      // Collect sample of jobs needing fill (up to 200)
      if (jobsNeedingFill.length < 200) {
        jobsNeedingFill.push({
          job_number: job.job_number,
          erp_job_id: job.erp_job_id,
          customer_name: job.customer_name,
          company: job.company,
          branch: job.branch,
          sales_by: job.sales_by,
          spoc_name: job.spoc_name || job.unbilled_spoc,
          salesEmpty,
          unbilledEmpty,
          goods_track_status: job.goods_track_status,
          matchedRule: rule ? {
            id: rule.id,
            company_name: rule.company_name,
            is_private_rule: rule.is_private_rule,
            branch: rule.branch,
            sales_spoc: rule.sales_spoc,
            unbilled_spoc: rule.unbilled_spoc,
            canFillSales,
            canFillUnbilled,
          } : null,
        });
      }
    }

    const unmappedWithCounts = Object.values(unmappedCounts).sort((a, b) => b.count - a.count);
    const unmappedCompanies = unmappedWithCounts.map(u => u.company);

    return NextResponse.json({
      wouldUpdate,
      totalJobsWithEmptySPOC: jobs.length,
      unmappedCompanies,
      unmappedWithCounts,
      jobsNeedingFill,
    });
  } catch (err: any) {
    console.error('[sync-spocs GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
