import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'csc-pods',
      Key: filename,
    });

    // Generate Presigned URL for viewing (expires in 15 minutes)
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // Redirect the browser to the presigned URL
    return NextResponse.redirect(presignedUrl);
  } catch (error: any) {
    console.error('Error generating presigned GET URL:', error);
    return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 });
  }
}
