import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { job_number, r2_url, document_type, filename } = await req.json();

    if (!job_number || !r2_url || !document_type) {
      return NextResponse.json({ error: 'job_number, r2_url, and document_type are required' }, { status: 400 });
    }

    // Fetch current job
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('documents')
      .eq('job_number', job_number)
      .single();

    if (fetchError) {
      console.error('Error fetching job:', fetchError);
      return NextResponse.json({ error: 'DB Error fetching job' }, { status: 500 });
    }

    const docs = job.documents || [];
    const existingIndex = docs.findIndex((d: any) => d.type === document_type);
    const newDoc = {
      type: document_type,
      url: r2_url,
      filename,
      uploaded_on: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      docs[existingIndex] = newDoc;
    } else {
      docs.push(newDoc);
    }

    // Update the jobs table
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ documents: docs })
      .eq('job_number', job_number)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job with document:', updateError);
      return NextResponse.json({ error: 'DB Error updating job with document: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pod: updated });
  } catch (error: any) {
    console.error('Error in POD upload:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
