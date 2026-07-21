import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function run() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
    });
    const response = await s3.send(command);
    if (!response.Contents || response.Contents.length === 0) {
      console.log('The bucket is empty.');
      return;
    }
    console.log('Files in R2 bucket:');
    response.Contents.forEach((file) => {
      console.log(`- ${file.Key} (${(file.Size || 0) / 1024} KB)`);
    });
  } catch (error) {
    console.error('Error listing objects:', error);
  }
}

run();
