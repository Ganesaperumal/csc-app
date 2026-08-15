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
        .select('job_number, enq_number, erp_job_id, job_date, branch, customer_name, company, goods_type, origin, destination, customer_phone, erp_status, invoice_number, invoice_date, goods_track_status, car_track_status, po_status, po_date, inv_request_date, bill_closure_date, sales_by, spoc_name, quote_value, car_included, csc_coordinator, unbilled_spoc, packing_date, actual_delivery, planned_delivery, created_at, updated_at')
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

    // Log egress event to usage_logs
    try {
      await supabase.from('usage_logs').insert([{
        action_type: 'sheets_export',
        resource: 'all_jobs',
        row_count: allJobs.length,
        estimated_bytes: Buffer.byteLength(JSON.stringify(allJobs), 'utf8'),
        metadata: { destination: 'Google Sheets Webhook' }
      }]);
    } catch (logErr) {
      // Non-blocking
    }

    return NextResponse.json({ success: true, count: allJobs.length });

  } catch (error: any) {
    console.error('Sheets Export Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
