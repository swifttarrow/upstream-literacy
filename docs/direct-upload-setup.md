# Upload via Cloud Storage (S3/R2)

All NCES file uploads (CCD, EDGE, and Membership) go through S3 or Cloudflare R2. Files are uploaded directly to cloud storage via presigned URLs, then the backend streams and processes them. There is no file size limit.

## 1. Create a bucket

### Cloudflare R2 (recommended, free tier)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → Create bucket
2. Name it e.g. `upstream-literacy-ingestion`
3. Go to **R2** → **Manage R2 API Tokens** → Create API token
   - Permissions: Object Read & Write
   - Specify the bucket or allow all
4. Note: **Access Key ID**, **Secret Access Key**, and your **Account ID** (from the R2 overview URL)

### AWS S3

1. Create an S3 bucket (e.g. `upstream-literacy-ingestion`)
2. Create an IAM user with `s3:PutObject` and `s3:GetObject` on that bucket
3. Note: **Access Key ID** and **Secret Access Key**

## 2. Configure CORS (browser uploads)

The browser uploads directly to the bucket. Configure CORS:

### R2

In the bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### S3

Bucket → Permissions → CORS:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.vercel.app"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## 3. Backend environment variables

Add to `backend/.env`:

### Cloudflare R2

```
S3_BUCKET=upstream-literacy-ingestion
S3_ACCESS_KEY_ID=<your R2 access key id>
S3_SECRET_ACCESS_KEY=<your R2 secret access key>
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
```

Replace `<ACCOUNT_ID>` with your Cloudflare account ID.

### AWS S3

```
S3_BUCKET=upstream-literacy-ingestion
S3_ACCESS_KEY_ID=<your aws access key>
S3_SECRET_ACCESS_KEY=<your aws secret key>
S3_REGION=us-east-1
```

(Omit `S3_ENDPOINT` for AWS S3.)

## 4. Restart the backend

Restart the backend so it picks up the new env vars. The Direct upload section in the Upload modal will then work.

## Flow

1. User selects Membership file → clicks "Upload & process"
2. Frontend calls `POST /admin/ingestion/upload-url` → gets presigned PUT URL
3. Frontend `PUT`s the file directly to that URL (bypasses your app, no size limit)
4. Frontend calls `POST /admin/ingestion/process-membership` with the object key
5. Backend streams the file from S3/R2, parses CSV, updates `district_candidates.enrollment`

## Troubleshooting

- **503 "Direct upload is not configured"** — S3 env vars not set or backend not restarted
- **403 on PUT** — CORS or bucket policy blocking; check AllowedOrigins include your frontend URL
- **403 SignatureDoesNotMatch** — Wrong credentials or endpoint (for R2, ensure `S3_ENDPOINT` uses your account ID)
