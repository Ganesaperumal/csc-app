import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// The expected structure of the incoming data from the GitHub cron job
interface ErpJobData {
  job_number: string;
  erp_job_id?: number;
  enq_number?: string;
  job_date?: string;
  branch?: string;
  customer_name?: string;
  company?: string;
  goods_type?: string;
  origin?: string;
  destination?: string;
  customer_phone?: string;
  erp_status: string; // The only field that gets updated if job exists
}

export async function POST(request: Request) {
  try {
    // 1. Basic API Key Authentication
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CRON_SECRET_KEY;
    
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const body: ErpJobData[] = await request.json();
    
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: Expected a non-empty array of jobs.' }, { status: 400 });
    }

    // 3. Separate new jobs from existing jobs
    const jobNumbers = body.map(job => job.job_number);
    const existingJobNumbers = new Set<string>();
    
    // Chunk the fetch to avoid URI too long errors
    const chunkSize = 500;
    for (let i = 0; i < jobNumbers.length; i += chunkSize) {
      const chunk = jobNumbers.slice(i, i + chunkSize);
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select('job_number')
        .in('job_number', chunk);

      if (fetchError) {
        console.error('Error fetching existing jobs:', fetchError);
        return NextResponse.json({ error: 'Database query failed', details: fetchError }, { status: 500 });
      }
      
      data?.forEach(job => existingJobNumbers.add(job.job_number));
    }
    
    const newJobsToInsert = [];
    const existingJobsToUpdate = [];

    for (const job of body) {
      if (existingJobNumbers.has(job.job_number)) {
        // Update erp_status, enq_number and erp_job_id for existing jobs
        existingJobsToUpdate.push({
          job_number: job.job_number,
          erp_job_id: job.erp_job_id,
          erp_status: job.erp_status,
          enq_number: job.enq_number,
          updated_at: new Date().toISOString()
        });
      } else {
        // Insert all data for new jobs
        newJobsToInsert.push(job);
      }
    }

    // 4. Perform Insert for New Jobs
    if (newJobsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('jobs')
        .insert(newJobsToInsert);
        
      if (insertError) {
        console.error('Error inserting new jobs:', insertError);
        return NextResponse.json({ error: 'Failed to insert new jobs', details: insertError }, { status: 500 });
      }
    }

    // 5. Perform Update for Existing Jobs (upserting with limited fields updates only those fields)
    if (existingJobsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('jobs')
        .upsert(existingJobsToUpdate, { onConflict: 'job_number' });
        
      if (updateError) {
        console.error('Error updating existing jobs:', updateError);
        return NextResponse.json({ error: 'Failed to update existing jobs', details: updateError }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${body.length} jobs. Inserted ${newJobsToInsert.length}, updated ${existingJobsToUpdate.length}.`
    });

  } catch (error: any) {
    console.error('Error processing ERP ingestion:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
