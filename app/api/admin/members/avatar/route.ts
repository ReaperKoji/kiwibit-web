import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionFromCookiesAsync } from '@/lib/session'
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

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const cookieStore = await cookies()
    const session = await getSessionFromCookiesAsync(cookieStore)
    if (!session || (session.role !== 'admin' && session.role !== 'member_manager')) {
      return jsonApiError(ctx, 403, 'Forbidden')
    }
    const uploadToken = request.headers.get('x-upload-token')
    const signed = verifyUploadToken(uploadToken, 'admin-avatar', session.memberId)
    if (!signed.ok) {
      return jsonApiError(ctx, 403, 'Invalid upload signature')
    }
    if (!enforceCsrf(request, cookieStore.get(getCsrfCookieName())?.value)) {
      return jsonApiError(ctx, 403, 'Invalid CSRF token')
    }
    const ip = getClientIp(request)
    const rate = await enforceRateLimit(`admin-avatar:${ip}:${session.memberId}`, 40)
    const daily = await enforceDailyLimit(`admin-upload-daily:${ip}:${session.memberId}`, 200)
    if (!rate.allowed) {
      return jsonApiError(ctx, 429, 'Too many requests')
    }
    if (!daily.allowed) {
      return jsonApiError(ctx, 429, 'Daily upload limit reached')
    }

    const formData = await request.formData()
    const rawFile = formData.get('file')
    if (!(rawFile instanceof File)) {
      return jsonApiError(ctx, 400, 'Invalid file payload')
    }
    if (rawFile.size > MAX_UPLOAD_BYTES) {
      return jsonApiError(ctx, 400, 'Max file size is 5MB')
    }

    const bytes = await rawFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const imageCheck = validateUploadedImage(buffer, rawFile.type, ALLOWED_TYPES)
    if (!imageCheck.ok) {
      return jsonApiError(ctx, 400, imageCheck.error)
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
          return jsonApiError(ctx, 400, 'Upload blocked by antivirus policy')
        }
      } catch {
        return jsonApiError(ctx, 503, 'Antivirus scanning unavailable')
      }
    }
    let sharpModule: typeof import('sharp')
    try {
      const sharpImport = await import('sharp')
      const maybeDefault = sharpImport as unknown as { default?: typeof import('sharp') }
      sharpModule = maybeDefault.default ?? (sharpImport as unknown as typeof import('sharp'))
    } catch {
      return jsonApiError(ctx, 500, 'Image optimizer unavailable (sharp not installed)')
    }

    const metadata = await sharpModule(buffer).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      return jsonApiError(ctx, 400, 'Avatar dimensions must be at least 240x240')
    }
    const ratio = width / height
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      return jsonApiError(ctx, 400, 'Avatar aspect ratio must be between 0.6 and 1.8')
    }

    const baseName = sanitizeFilePart(path.parse(rawFile.name).name || 'avatar')
    const fileBase = `${Date.now()}-${baseName}`
    const fileName = `${fileBase}.webp`
    const fileNameAvif = `${fileBase}.avif`
    const outputBuffer = await sharpModule(buffer).rotate().resize(640, 640, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
    const outputAvif = await sharpModule(buffer).rotate().resize(640, 640, { fit: 'cover', withoutEnlargement: true }).avif({ quality: 62 }).toBuffer()

    if (isObjectStorageEnabled()) {
      const uploaded = await uploadObjectToStorage({
        key: `members/admin/${fileName}`,
        body: outputBuffer,
        contentType: 'image/webp',
      })
      const uploadedAvif = await uploadObjectToStorage({
        key: `members/admin/${fileNameAvif}`,
        body: outputAvif,
        contentType: 'image/avif',
      })
      return withRequestId(ctx, NextResponse.json({ ok: true, url: uploaded.url, avifUrl: uploadedAvif.url }))
    }

    const relativeDir = path.join('uploads', 'members', 'admin')
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
    await fs.mkdir(absoluteDir, { recursive: true })
    await fs.writeFile(path.join(absoluteDir, fileName), outputBuffer)
    await fs.writeFile(path.join(absoluteDir, fileNameAvif), outputAvif)
    return withRequestId(
      ctx,
      NextResponse.json({
        ok: true,
        url: `/${relativeDir.replace(/\\/g, '/')}/${fileName}`,
        avifUrl: `/${relativeDir.replace(/\\/g, '/')}/${fileNameAvif}`,
      })
    )
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not upload avatar')
  }
}
