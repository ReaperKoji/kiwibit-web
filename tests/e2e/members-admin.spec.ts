import path from 'path'
import { expect, test } from '@playwright/test'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('EMAIL_ADDRESS').fill('gustavo@kiwibit.com')
  await page.getByPlaceholder('********').fill('kiwi1234')
  await page.getByRole('button', { name: /Authorize Access/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

test('team directory loads dynamically', async ({ page }) => {
  await page.goto('/team')
  await expect(page.getByRole('heading', { name: /Our Members/i })).toBeVisible()
  await expect(page.getByText(/Dynamic team data loaded from API/i)).toBeVisible()
})

test('admin members flow: create, edit, upload and soft-delete', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: /Admin Members/i })).toBeVisible()

  const unique = Date.now()
  const memberName = `QA Member ${unique}`
  const memberRole = 'Security Researcher'
  const memberBio = 'QA automated member biography with enough characters to pass schema checks in this test scenario.'
  const memberEmail = `qa-member-${unique}@kiwibit.com`

  await page.getByRole('button', { name: /New Member/i }).click()
  await page.getByPlaceholder('Name').fill(memberName)
  await page.getByPlaceholder('Role').fill(memberRole)
  await page.getByPlaceholder('Bio').fill(memberBio)
  await page.getByPlaceholder('Avatar URL').fill('https://avatars.githubusercontent.com/u/1?v=4')
  await page.getByPlaceholder('Specialties (comma separated)').fill('TypeScript, Next.js, Security')
  await page.getByPlaceholder('GitHub URL (optional)').fill('')
  await page.getByPlaceholder('LinkedIn URL (optional)').fill('')
  await page.getByPlaceholder('Account email (optional)').fill(memberEmail)
  await page.getByPlaceholder('Account password (optional)').fill('kiwi1234')
  await page.locator('form button[type="submit"]').first().click()
  await expect(page.getByText(/Member created|Member updated/i)).toBeVisible()

  const filePath = path.join(process.cwd(), 'public', 'Kiwi.png')
  await page.locator('input[type="file"]').first().setInputFiles(filePath)
  await expect(page.getByText(/Avatar uploaded|upload/i)).toBeVisible()

  await page.getByPlaceholder('Role').fill('Lead Security Researcher')
  await page.locator('form button[type="submit"]').first().click()
  await expect(page.getByText(/Member created|Member updated/i)).toBeVisible()

  page.once('dialog', async (dialog) => {
    await dialog.accept('DELETE')
  })
  await page.getByRole('button', { name: /Soft Delete/i }).click()
  await expect(page.getByText(/soft-deleted|deleted/i)).toBeVisible()
})
