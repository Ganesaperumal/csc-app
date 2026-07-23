import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const BUCKET_NAME = 'documents';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const jobNumber = formData.get('job_number') as string | null;
    const documentType = formData.get('document_type') as string | null;

    if (!file || !jobNumber || !documentType) {
      return NextResponse.json(
        { error: 'File, job_number, and document_type are required' },
        { status: 400 }
      );
    }

    // Extract XXXX and YY from job number (Format: JB/XXXX/YY/ZZZ or similar)
    // Example: JB/3585/26/BLR -> parts: ['JB', '3585', '26', 'BLR']
    const parts = jobNumber.split('/');
    let xxxx = '';
    let yy = '';

    if (parts.length >= 3) {
      xxxx = parts[1];
      yy = parts[2];
    } else {
      const matches = jobNumber.match(/\d+/g);
      if (matches && matches.length >= 2) {
        xxxx = matches[0];
        yy = matches[1];
      } else {
        xxxx = jobNumber.replace(/[^0-9]/g, '') || '0000';
        yy = new Date().getFullYear().toString().slice(-2);
      }
    }

    const docPrefix = documentType.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const finalFilename = `${docPrefix}-${yy}-${xxxx}.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure storage bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (buckets && !buckets.some(b => b.name === BUCKET_NAME)) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
    }

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(finalFilename, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase Storage Upload Error:', uploadError);
      return NextResponse.json({ error: 'Storage Upload Failed: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(finalFilename);

    const publicUrl = publicUrlData.publicUrl;

    // Update job record in Supabase DB
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('documents')
      .eq('job_number', jobNumber)
      .single();

    if (fetchError) {
      console.error('Error fetching job during upload:', fetchError);
      return NextResponse.json({ error: 'DB Error fetching job' }, { status: 500 });
    }

    const docs = job.documents || [];
    const existingIndex = docs.findIndex((d: any) => d.type === documentType);
    const newDoc = {
      type: documentType,
      url: publicUrl,
      filename: finalFilename,
      uploaded_on: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      docs[existingIndex] = newDoc;
    } else {
      docs.push(newDoc);
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('jobs')
      .update({ documents: docs })
      .eq('job_number', jobNumber)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job document record:', updateError);
      return NextResponse.json({ error: 'DB Error updating job record: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      filename: finalFilename,
      publicUrl,
      job: updated
    });
  } catch (error: any) {
    console.error('Error handling document upload:', error);
    return NextResponse.json({ error: error.message || 'Server upload failed' }, { status: 500 });
  }
}
