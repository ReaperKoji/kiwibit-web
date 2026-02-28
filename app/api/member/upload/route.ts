import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionFromCookiesAsync } from '@/lib/session'
import { appendAuditLog } from '@/lib/audit-log'
import { isObjectStorageEnabled, uploadObjectToStorage } from '@/lib/object-storage'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { enforceCsrf, enforceDailyLimit, enforceRateLimit, getClientIp, getCsrfCookieName } from '@/lib/security'
import { verifyUploadToken } from '@/lib/upload-signature'
import { validateUploadedImage } from '@/lib/upload-security'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MIN_DIMENSION = 240
const MIN_RATIO = 0.6
const MAX_RATIO = 1.8
const SIZES = [
  { key: 'sm', width: 320 },
  { key: 'md', width: 640 },
  { key: 'lg', width: 1024 },
] as const

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const cookieStore = await cookies()
    const session = await getSessionFromCookiesAsync(cookieStore)
    const ip = getClientIp(request)
    const rate = await enforceRateLimit(`upload:${ip}:${session?.memberId ?? 'anon'}`, 40)
    const daily = await enforceDailyLimit(`upload-daily:${ip}:${session?.memberId ?? 'anon'}`, 150)

    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    if (!daily.allowed) {
      return NextResponse.json({ error: 'Daily upload limit reached' }, { status: 429 })
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const uploadToken = request.headers.get('x-upload-token')
    const signed = verifyUploadToken(uploadToken, 'member-avatar', session.memberId)
    if (!signed.ok) {
      return NextResponse.json({ error: 'Invalid upload signature' }, { status: 403 })
    }
    if (!enforceCsrf(request, cookieStore.get(getCsrfCookieName())?.value)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }

    const formData = await request.formData()
    const rawFile = formData.get('file')
    if (!(rawFile instanceof File)) {
      return NextResponse.json({ error: 'Invalid file payload' }, { status: 400 })
    }
    if (rawFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Max file size is 5MB' }, { status: 400 })
    }

    const bytes = await rawFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const imageCheck = validateUploadedImage(buffer, rawFile.type, ALLOWED_TYPES)
    if (!imageCheck.ok) {
      return NextResponse.json({ error: imageCheck.error }, { status: 400 })
    }
    if (process.env.AV_SCAN_WEBHOOK_URL) {
      try {
        const scan = await fetch(process.env.AV_SCAN_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            fileName: rawFile.name,
            mimeType: rawFile.type,
            size: rawFile.size,
            actor: session.memberId,
          }),
        })
        if (!scan.ok) {
          return NextResponse.json({ error: 'Upload blocked by antivirus policy' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Antivirus scanning unavailable' }, { status: 503 })
      }
    }
    let sharpModule: typeof import('sharp')
    try {
      const sharpImport = await import('sharp')
      const maybeDefault = sharpImport as unknown as { default?: typeof import('sharp') }
      sharpModule = maybeDefault.default ?? (sharpImport as unknown as typeof import('sharp'))
    } catch {
      return NextResponse.json({ error: 'Image optimizer unavailable (sharp not installed)' }, { status: 500 })
    }
    const metadata = await sharpModule(buffer).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      return NextResponse.json({ error: 'Avatar dimensions must be at least 240x240' }, { status: 400 })
    }
    const ratio = width / height
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      return NextResponse.json({ error: 'Avatar aspect ratio must be between 0.6 and 1.8' }, { status: 400 })
    }
    const baseName = sanitizeFilePart(path.parse(rawFile.name).name || 'avatar')
    const fileNameBase = `${Date.now()}-${baseName}`

    const urls: Record<string, string> = {}
    if (isObjectStorageEnabled()) {
      try {
        for (const size of SIZES) {
          const fileName = `${fileNameBase}-${size.key}.webp`
          const fileNameAvif = `${fileNameBase}-${size.key}.avif`
          const outputBuffer = await sharpModule(buffer).rotate().resize(size.width, size.width, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
          const outputAvif = await sharpModule(buffer).rotate().resize(size.width, size.width, { fit: 'cover', withoutEnlargement: true }).avif({ quality: 62 }).toBuffer()
          const uploaded = await uploadObjectToStorage({
            key: `members/${sanitizeFilePart(session.memberId)}/${fileName}`,
            body: outputBuffer,
            contentType: 'image/webp',
          })
          const uploadedAvif = await uploadObjectToStorage({
            key: `members/${sanitizeFilePart(session.memberId)}/${fileNameAvif}`,
            body: outputAvif,
            contentType: 'image/avif',
          })
          urls[size.key] = uploaded.url
          urls[`${size.key}Avif`] = uploadedAvif.url
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : 'Object storage upload failed',
          },
          { status: 500 }
        )
      }
    } else {
      const relativeDir = path.join('uploads', 'members', sanitizeFilePart(session.memberId))
      const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
      await fs.mkdir(absoluteDir, { recursive: true })
      for (const size of SIZES) {
        const fileName = `${fileNameBase}-${size.key}.webp`
        const fileNameAvif = `${fileNameBase}-${size.key}.avif`
        const outputBuffer = await sharpModule(buffer).rotate().resize(size.width, size.width, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
        const outputAvif = await sharpModule(buffer).rotate().resize(size.width, size.width, { fit: 'cover', withoutEnlargement: true }).avif({ quality: 62 }).toBuffer()
        await fs.writeFile(path.join(absoluteDir, fileName), outputBuffer)
        await fs.writeFile(path.join(absoluteDir, fileNameAvif), outputAvif)
        urls[size.key] = `/${relativeDir.replace(/\\/g, '/')}/${fileName}`
        urls[`${size.key}Avif`] = `/${relativeDir.replace(/\\/g, '/')}/${fileNameAvif}`
      }
    }

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: session.memberId,
      actorRole: session.role,
      targetMemberId: session.memberId,
      action: 'avatar_upload',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    })

    return withRequestId(
      ctx,
      NextResponse.json({
        ok: true,
        url: urls.md,
        variants: urls,
      })
    )
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Unexpected member upload error')
  }
}
