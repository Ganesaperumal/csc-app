import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    // Format validation on server side
    // Standard format: POD-YY-X.pdf (e.g., POD-26-1.pdf, POD-26-1234.pdf)
    const normalizedFilename = filename.toUpperCase().replace(/[_]/g, '-');
    const isValidFormat = /^POD-\d{2}-\d+\.PDF$/.test(normalizedFilename);

    if (!isValidFormat) {
       return NextResponse.json({ error: 'Invalid filename format. Expected POD-YY-X.pdf' }, { status: 400 });
    }

    // Command to put object in bucket
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'csc-pods',
      Key: normalizedFilename,
      ContentType: contentType,
    });

    // Generate Presigned URL (expires in 15 minutes)
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return NextResponse.json({ 
      presignedUrl, 
      finalFilename: normalizedFilename,
      publicUrl: `https://${process.env.R2_PUBLIC_DOMAIN}/${normalizedFilename}`
    });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
}
