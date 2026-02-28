const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

const routes = [
  '/',
  '/blog',
  '/team',
  '/login',
  '/api/blog/posts?page=1&pageSize=8',
  '/api/members',
]

async function hit(path) {
  const response = await fetch(`${baseUrl}${path}`)
  if (!response.ok) {
    throw new Error(`Warmup failed: ${path} -> ${response.status}`)
  }
}

async function run() {
  for (const path of routes) {
    await hit(path)
  }
  console.log(`Warmup completed for ${routes.length} critical routes.`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
