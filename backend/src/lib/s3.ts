/**
 * S3/R2 client for presigned URLs and object streaming.
 * Works with AWS S3 and Cloudflare R2 (set S3_ENDPOINT for R2).
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'us-east-1';
const endpoint = process.env.S3_ENDPOINT || undefined;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

function getClient(): S3Client | null {
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: endpoint ? 'auto' : region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function isS3Configured(): boolean {
  return !!(bucket && accessKeyId && secretAccessKey);
}

/**
 * Generate a presigned PUT URL for direct browser upload.
 * Caller uploads with: fetch(url, { method: 'PUT', body: file })
 */
export async function getPresignedPutUrl(
  key: string,
  options?: { contentType?: string; expiresIn?: number }
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options?.contentType || 'text/csv',
    }),
    { expiresIn: options?.expiresIn ?? 3600 }
  );
  return url;
}

/**
 * Get a readable stream of an object from S3/R2.
 */
export async function getObjectStream(key: string): Promise<Readable | null> {
  const client = getClient();
  if (!client) return null;
  const res = await client.send(
    new GetObjectCommand({ Bucket: bucket!, Key: key })
  );
  return (res.Body as Readable) ?? null;
}
