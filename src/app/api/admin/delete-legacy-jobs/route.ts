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

    // Extract, clean, and build case variations (original, uppercase, lowercase)
    const cleanedInputs = Array.from(
      new Set(
        jobNumbers
          .flatMap(jn => (typeof jn === 'string' ? jn.split(/[\r\n,\t;]+/) : []))
          .map(jn => jn.trim().replace(/^["']|["']$/g, ''))
          .filter(jn => jn.length > 0)
      )
    );

    if (cleanedInputs.length === 0) {
      return NextResponse.json({ error: 'No valid non-empty job numbers provided' }, { status: 400 });
    }

    // Build candidates including upper/lower case variations for robust matching
    const candidates = Array.from(
      new Set(
        cleanedInputs.flatMap(item => [
          item,
          item.toUpperCase(),
          item.toLowerCase()
        ])
      )
    );

    // 1. Delete rows matching job_number
    const { data: deletedByJob, error: errorJob } = await supabaseAdmin
      .from('legacy_jobs')
      .delete()
      .in('job_number', candidates)
      .select('job_number, enquiry_number');

    if (errorJob) {
      console.error('Error deleting from legacy_jobs by job_number:', errorJob);
      throw new Error(errorJob.message);
    }

    // 2. Delete rows matching enquiry_number (in case user passed ENQ numbers)
    const { data: deletedByEnq, error: errorEnq } = await supabaseAdmin
      .from('legacy_jobs')
      .delete()
      .in('enquiry_number', candidates)
      .select('job_number, enquiry_number');

    if (errorEnq) {
      console.error('Error deleting from legacy_jobs by enquiry_number:', errorEnq);
      throw new Error(errorEnq.message);
    }

    // Combine deleted rows and deduplicate
    const combinedDeleted = [...(deletedByJob || []), ...(deletedByEnq || [])];
    const uniqueDeletedMap = new Map<string, any>();
    combinedDeleted.forEach(row => {
      const key = row.job_number || row.enquiry_number;
      if (key) uniqueDeletedMap.set(key, row);
    });

    const deletedRows = Array.from(uniqueDeletedMap.values());
    const deletedCount = deletedRows.length;
    const deletedIdentifiers = deletedRows.map(r => r.job_number || r.enquiry_number);

    return NextResponse.json({
      success: true,
      message: deletedCount > 0 
        ? `Successfully deleted ${deletedCount} legacy job(s) from legacy_jobs table.`
        : `No matching legacy jobs found in DB for the provided job numbers.`,
      deletedCount,
      requestedCount: cleanedInputs.length,
      requestedJobNumbers: cleanedInputs,
      deletedJobNumbers: deletedIdentifiers
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete legacy jobs' }, { status: 500 });
  }
}
