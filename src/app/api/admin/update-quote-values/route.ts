import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const rows = body?.rows as { job_number: string; quote_value: string | number | null }[];

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided for quote value update.' }, { status: 400 });
    }

    let updatedCount = 0;

    for (const row of rows) {
      if (!row.job_number) continue;

      const cleanJobNum = row.job_number.trim();
      const rawVal = typeof row.quote_value === 'string' ? row.quote_value.trim() : row.quote_value;
      const quoteVal = (rawVal === '' || rawVal === null || rawVal === undefined)
        ? null
        : (isNaN(Number(rawVal)) ? rawVal : Number(rawVal));

      // 1. Try updating jobs table by job_number
      let { data: updatedJobs, error: jobErr } = await supabaseAdmin
        .from('jobs')
        .update({ quote_value: quoteVal })
        .eq('job_number', cleanJobNum)
        .select('enq_number, job_number');

      if (jobErr) {
        console.error(`Error updating jobs by job_number (${cleanJobNum}):`, jobErr.message || jobErr);
      }

      // If no jobs were updated by job_number, fallback to matching enq_number on jobs table
      if (!updatedJobs || updatedJobs.length === 0) {
        const { data: fallbackJobs, error: fallbackErr } = await supabaseAdmin
          .from('jobs')
          .update({ quote_value: quoteVal })
          .eq('enq_number', cleanJobNum)
          .select('enq_number, job_number');

        if (fallbackErr) {
          console.error(`Error updating jobs by enq_number (${cleanJobNum}):`, fallbackErr.message || fallbackErr);
        } else if (fallbackJobs) {
          updatedJobs = fallbackJobs;
        }
      }

      // 2. Sync enquiry_values table using service role (bypasses client RLS)
      if (updatedJobs && updatedJobs.length > 0) {
        for (const j of updatedJobs) {
          if (j.enq_number) {
            const { error: enqErr } = await supabaseAdmin
              .from('enquiry_values')
              .upsert({ enquiry_number: j.enq_number, quote_value: quoteVal }, { onConflict: 'enquiry_number' });

            if (enqErr) {
              console.error(`Error upserting enquiry_values (${j.enq_number}):`, enqErr.message || enqErr);
            }
          }
        }
      } else {
        // If cleanJobNum is an enquiry_number directly
        const { error: enqErr } = await supabaseAdmin
          .from('enquiry_values')
          .upsert({ enquiry_number: cleanJobNum, quote_value: quoteVal }, { onConflict: 'enquiry_number' });

        if (enqErr) {
          console.error(`Error upserting enquiry_values directly (${cleanJobNum}):`, enqErr.message || enqErr);
        }
      }

      updatedCount++;
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
