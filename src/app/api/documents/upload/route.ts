import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Configure S3Client specifically for Cloudflare R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Crucial for R2 compatibility in serverless environments
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    const bucketName = process.env.R2_BUCKET_NAME || 'csc';

    // 1. Upload direct to Cloudflare R2 bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: finalFilename,
        Body: buffer,
        ContentType: file.type || 'application/pdf',
      })
    );

    const r2Url = `https://${process.env.R2_PUBLIC_DOMAIN}/${finalFilename}`;

    // 2. Update job record in Supabase DB with document metadata
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
      url: r2Url,
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
      publicUrl: r2Url,
      job: updated
    });
  } catch (error: any) {
    console.error('Error handling document upload to Cloudflare R2:', error);
    return NextResponse.json({ error: error.message || 'Server upload to Cloudflare R2 failed' }, { status: 500 });
  }
}
