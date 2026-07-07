import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Google Sheets webhook URL is not configured' }, { status: 400 });
    }

    let allJobs: any[] = [];
    let from = 0;
    const step = 1000;
    
    // Loop to bypass the 1000-row PostgREST limit and fetch everything
    while (true) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('erp_job_id', { ascending: false, nullsFirst: false })
        .range(from, from + step - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allJobs = allJobs.concat(data);
      if (data.length < step) break; // Reached the end
      from += step;
    }

    if (allJobs.length === 0) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    console.log(`Sending ${allJobs.length} jobs to Google Sheets webhook...`);
    const sheetResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allJobs)
    });

    if (!sheetResponse.ok) {
      const errText = await sheetResponse.text();
      console.error('Google Sheets webhook returned error:', errText);
      return NextResponse.json({ error: 'Webhook failed', details: errText }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: allJobs.length });

  } catch (error: any) {
    console.error('Sheets Export Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
