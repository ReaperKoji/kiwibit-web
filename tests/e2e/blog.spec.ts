import { expect, test } from '@playwright/test'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('EMAIL_ADDRESS').fill('gustavo@kiwibit.com')
  await page.getByPlaceholder('********').fill('kiwi1234')
  await page.getByRole('button', { name: /Authorize Access/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

test('blog list and post navigation', async ({ page }) => {
  await page.goto('/blog')
  await expect(page.getByRole('heading', { name: /KIWI BIT Blog/i })).toBeVisible()
  const firstPost = page.locator('a[href^="/blog/"]:has-text("View post")').first()
  await firstPost.click()
  await page.waitForURL('**/blog/**')
  await expect(page.locator('article')).toBeVisible()
})

test('newsletter subscribe flow', async ({ page }) => {
  await page.goto('/blog')
  await page.getByPlaceholder('you@company.com').fill('qa+blog@kiwibit.com')
  await page.getByRole('button', { name: /Subscribe/i }).click()
  await expect(page.locator('text=Check confirmation link')).toBeVisible()
})

test('admin content panel opens', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/content')
  await page.waitForURL('**/admin/content')
  await expect(page.getByRole('heading', { name: /Content Admin/i })).toBeVisible({ timeout: 15000 })
})

test('admin blog publish flow', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/content')

  await expect(page.getByRole('heading', { name: /Content Admin/i })).toBeVisible()
  await page.getByPlaceholder('Title').fill(`Automated QA Post ${Date.now()}`)
  await page.getByPlaceholder('Excerpt').fill('Automated publish flow validation from Playwright.')
  await page.locator('textarea').first().fill('## Automated QA\n- Created by e2e test\n- Validates save and publish')

  await page.getByRole('button', { name: /^Save$/i }).click()
  await expect(page.getByText(/Post saved|saved/i)).toBeVisible()

  await page.getByRole('button', { name: /^Publish$/i }).click()
  await expect(page.getByText('Action publish completed.')).toBeVisible()
})
