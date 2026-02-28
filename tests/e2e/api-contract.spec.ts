import { expect, test } from '@playwright/test'

test('GET /api/members returns contract shape', async ({ request }) => {
  const response = await request.get('/api/members')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['cache-control']).toContain('s-maxage')
  const data = (await response.json()) as { members: Array<{ id: string; name: string; role: string }> }
  expect(Array.isArray(data.members)).toBeTruthy()
  if (data.members.length > 0) {
    expect(typeof data.members[0].id).toBe('string')
    expect(typeof data.members[0].name).toBe('string')
    expect(typeof data.members[0].role).toBe('string')
  }
})

test('POST /api/auth/login validates payload', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'not-an-email',
      password: '12',
    },
  })
  expect(response.status()).toBe(400)
  const data = (await response.json()) as { error?: string }
  expect(data.error).toBeTruthy()
})

test('POST /api/auth/login rejects invalid credentials', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'unknown@kiwibit.com',
      password: 'invalid-password',
    },
  })
  expect([400, 401, 503]).toContain(response.status())
  const data = (await response.json()) as { error?: string }
  expect(data.error).toBeTruthy()
})

test('GET /api/admin/members requires session', async ({ request }) => {
  const response = await request.get('/api/admin/members')
  expect([401, 403]).toContain(response.status())
})

test('POST /api/admin/members/bulk requires session and csrf', async ({ request }) => {
  const response = await request.post('/api/admin/members/bulk', {
    data: { action: 'activate', ids: ['example-id'] },
  })
  expect([401, 403]).toContain(response.status())
})

test('GET /api/blog/search/semantic requires q', async ({ request }) => {
  const response = await request.get('/api/blog/search/semantic')
  expect(response.status()).toBe(400)
})

test('GET /api/activity/feed contract', async ({ request }) => {
  const response = await request.get('/api/activity/feed')
  expect(response.ok()).toBeTruthy()
  const data = (await response.json()) as { items?: unknown[] }
  expect(Array.isArray(data.items)).toBeTruthy()
})

test('GET /api/member/reputation/ranking contract', async ({ request }) => {
  const response = await request.get('/api/member/reputation/ranking')
  expect(response.ok()).toBeTruthy()
  const data = (await response.json()) as { items?: Array<{ memberId: string; score: number }> }
  expect(Array.isArray(data.items)).toBeTruthy()
  if (data.items && data.items.length > 0) {
    expect(typeof data.items[0].memberId).toBe('string')
    expect(typeof data.items[0].score).toBe('number')
  }
})

test('POST /api/admin/posts/assist requires session and csrf', async ({ request }) => {
  const response = await request.post('/api/admin/posts/assist', {
    data: {
      draftContent: 'x'.repeat(100),
      currentTitle: 'Title',
      currentExcerpt: 'Excerpt',
    },
  })
  expect([401, 403]).toContain(response.status())
})
