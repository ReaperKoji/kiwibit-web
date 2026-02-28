export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000'

export function absoluteUrl(pathname: string) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${SITE_URL}${path}`
}
