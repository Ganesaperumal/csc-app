import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const job_number = searchParams.get('job_number');

    if (!job_number) {
      return NextResponse.json({ error: 'job_number is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('job_pods')
      .select('*')
      .eq('job_number', job_number)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database Fetch Error:', error);
      return NextResponse.json({ error: 'Database Error: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pods: data });
  } catch (error: any) {
    console.error('Error in POD list route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
