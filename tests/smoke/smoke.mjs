const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

async function mustOk(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init)
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Smoke failed: ${path} -> ${response.status} ${body}`)
  }
}

async function run() {
  await mustOk('/api/health')
  await mustOk('/blog')
  await mustOk('/api/blog/posts?page=1&pageSize=4')
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid@kiwibit.com', password: 'badpassword123' }),
  })
  if (![400, 401, 503].includes(login.status)) {
    throw new Error(`Smoke failed: /api/auth/login expected 400, 401 or 503, got ${login.status}`)
  }
  console.log('Smoke checks passed.')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
