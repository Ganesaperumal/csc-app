import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://e2ec01a9060ed09171130e48b3969417.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: 'e42415d6a5a4ffac35354eda99a593fa',
    secretAccessKey: '00013e3623f12880b2e3dfc463680fd0ea1bf60b608089ecffbc25a418ef0da5',
  },
});

async function run() {
  try {
    console.log("Uploading...");
    await s3.send(new PutObjectCommand({
      Bucket: 'csc',
      Key: 'test-upload.txt',
      Body: 'Hello World',
      ContentType: 'text/plain'
    }));
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
