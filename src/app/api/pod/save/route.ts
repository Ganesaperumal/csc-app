import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { job_number, r2_url } = await req.json();

    if (!job_number || !r2_url) {
      return NextResponse.json({ error: 'job_number and r2_url are required' }, { status: 400 });
    }

    // Update the jobs table directly
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({
        pod_url: r2_url,
        pod_uploaded_on: new Date().toISOString().split('T')[0]
      })
      .eq('job_number', job_number)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job with POD:', updateError);
      return NextResponse.json({ error: 'DB Error updating job with POD: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pod: updated });
  } catch (error: any) {
    console.error('Error in POD upload:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
