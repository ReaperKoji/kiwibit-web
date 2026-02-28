const SVG_PATTERN = /<svg[\s>]/i

export function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  const head = buffer.subarray(0, 512).toString('utf8')
  if (SVG_PATTERN.test(head)) {
    return 'image/svg+xml'
  }
  return null
}

export function validateUploadedImage(
  buffer: Buffer,
  declaredMime: string,
  allowedTypes: ReadonlySet<string>
): { ok: true; detectedMime: string } | { ok: false; error: string } {
  const detectedMime = detectMimeFromBuffer(buffer)
  if (!detectedMime) {
    return { ok: false, error: 'Unsupported image payload' }
  }
  if (detectedMime === 'image/svg+xml') {
    return { ok: false, error: 'SVG uploads are blocked for security reasons' }
  }
  if (!allowedTypes.has(detectedMime)) {
    return { ok: false, error: 'Only JPG, PNG and WEBP are allowed' }
  }
  if (declaredMime && declaredMime !== detectedMime) {
    return { ok: false, error: 'File MIME type does not match file content' }
  }
  return { ok: true, detectedMime }
}
