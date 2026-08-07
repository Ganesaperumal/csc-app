import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { jobNumbers } = body as { jobNumbers?: string[] };

    if (!jobNumbers || !Array.isArray(jobNumbers) || jobNumbers.length === 0) {
      return NextResponse.json({ error: 'No job numbers provided for deletion' }, { status: 400 });
    }

    // Clean and filter job numbers
    const cleanedJobNumbers = Array.from(
      new Set(
        jobNumbers
          .map(jn => (typeof jn === 'string' ? jn.trim() : ''))
          .filter(jn => jn.length > 0)
      )
    );

    if (cleanedJobNumbers.length === 0) {
      return NextResponse.json({ error: 'No valid non-empty job numbers provided' }, { status: 400 });
    }

    // STRICTLY target the `legacy_jobs` table ONLY
    const { data, error } = await supabaseAdmin
      .from('legacy_jobs')
      .delete()
      .in('job_number', cleanedJobNumbers)
      .select('job_number');

    if (error) {
      console.error('Error deleting from legacy_jobs:', error);
      throw new Error(error.message);
    }

    const deletedCount = data?.length || 0;
    const deletedJobNumbers = data?.map(d => d.job_number) || [];

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} legacy job(s) from legacy_jobs table.`,
      deletedCount,
      requestedCount: cleanedJobNumbers.length,
      deletedJobNumbers
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete legacy jobs' }, { status: 500 });
  }
}
