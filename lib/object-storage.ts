import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type UploadOptions = {
  key: string
  body: Buffer
  contentType: string
  cacheControl?: string
}

function sanitizeKey(value: string) {
  return value.replace(/^\/+/, '').replace(/\\/g, '/')
}

export function isObjectStorageEnabled() {
  return Boolean(
    process.env.OBJECT_STORAGE_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.OBJECT_STORAGE_ENDPOINT || process.env.OBJECT_STORAGE_REGION)
  )
}

function buildPublicUrl(key: string) {
  const normalized = sanitizeKey(key)
  const publicBase = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL
  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/${normalized}`
  }
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT
  if (!endpoint) {
    throw new Error('OBJECT_STORAGE_PUBLIC_BASE_URL or OBJECT_STORAGE_ENDPOINT is required')
  }
  return `${endpoint.replace(/\/$/, '')}/${normalized}`
}

export async function uploadObjectToStorage(options: UploadOptions) {
  const bucket = process.env.OBJECT_STORAGE_BUCKET
  const region = process.env.OBJECT_STORAGE_REGION ?? 'auto'
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!bucket || !accessKeyId || !secretAccessKey || (!endpoint && !region)) {
    throw new Error('Object storage environment is incomplete')
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const key = sanitizeKey(options.key)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: options.body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl ?? 'public, max-age=31536000, immutable',
    })
  )

  return {
    key,
    url: buildPublicUrl(key),
  }
}
