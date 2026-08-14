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
  return NextResponse.json({ error: 'SPOC Auto-Fill Sync is currently disabled.' }, { status: 403 });
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
