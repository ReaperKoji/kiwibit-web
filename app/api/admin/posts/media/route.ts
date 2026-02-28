import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isObjectStorageEnabled, uploadObjectToStorage } from '@/lib/object-storage'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { enforceCsrf, getCsrfCookieName } from '@/lib/security'
import { getSessionFromCookiesAsync } from '@/lib/session'
import { verifyUploadToken } from '@/lib/upload-signature'

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const cookieStore = await cookies()
    const session = await getSessionFromCookiesAsync(cookieStore)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const uploadToken = request.headers.get('x-upload-token')
    const signed = verifyUploadToken(uploadToken, 'admin-media', session.memberId)
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
    if (!ALLOWED_TYPES.has(rawFile.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG and WEBP are allowed' }, { status: 400 })
    }
    if (rawFile.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Max file size is 6MB' }, { status: 400 })
    }

    const bytes = await rawFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let sharpModule: typeof import('sharp')
    try {
      const sharpImport = await import('sharp')
      const maybeDefault = sharpImport as unknown as { default?: typeof import('sharp') }
      sharpModule = maybeDefault.default ?? (sharpImport as unknown as typeof import('sharp'))
    } catch {
      return NextResponse.json({ error: 'Image optimizer unavailable (sharp not installed)' }, { status: 500 })
    }

    const baseName = sanitizeFilePart(path.parse(rawFile.name).name || 'cover')
    const fileBase = `${Date.now()}-${baseName}`
    const fileName = `${fileBase}.webp`
    const fileNameAvif = `${fileBase}.avif`

    const outputBuffer = await sharpModule(buffer).resize(1400).webp({ quality: 84 }).toBuffer()
    const outputAvif = await sharpModule(buffer).resize(1400).avif({ quality: 62 }).toBuffer()
    if (isObjectStorageEnabled()) {
      try {
        const uploaded = await uploadObjectToStorage({
          key: `blog/${fileName}`,
          body: outputBuffer,
          contentType: 'image/webp',
        })
        const uploadedAvif = await uploadObjectToStorage({
          key: `blog/${fileNameAvif}`,
          body: outputAvif,
          contentType: 'image/avif',
        })
        return withRequestId(
          ctx,
          NextResponse.json({
            ok: true,
            url: uploaded.url,
            avifUrl: uploadedAvif.url,
          })
        )
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : 'Object storage upload failed',
          },
          { status: 500 }
        )
      }
    }
 

    const relativeDir = path.join('uploads', 'blog')
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
    return jsonApiError(ctx, 500, 'Unexpected media upload error')
  }
}
