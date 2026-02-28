import path from 'path'
import { expect, test } from '@playwright/test'

async function loginAsMember(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByPlaceholder('EMAIL_ADDRESS').fill('gustavo@kiwibit.com')
  await page.getByPlaceholder('********').fill('kiwi1234')
  await page.getByRole('button', { name: /Authorize Access/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  await page.goto('/member/manage')
  await page.waitForURL('**/member/manage')
}

test('member critical flow: login, draft save, publish/submit, revert', async ({ page }) => {
  await loginAsMember(page)
  await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible({ timeout: 15000 })

  const bio = page.locator('textarea').first()
  await bio.fill('Updated bio from automated test. This should be enough characters for validation checks.')
  await page.getByRole('button', { name: /Save Draft/i }).click()

  await expect(page.getByText('Rascunho salvo e nova versao criada.')).toBeVisible()
  await bio.fill('Updated bio before publish action. Validation for submit flow.')
  await page.getByRole('button', { name: /Submit Review|Publish/i }).click()
  await expect(page.getByText('Versao publicada com sucesso.')).toBeVisible()
  await page.getByRole('button', { name: /Revert/i }).first().click()
})

test('member upload avatar flow', async ({ page }) => {
  await loginAsMember(page)

  const filePath = path.join(process.cwd(), 'public', 'Kiwi.png')
  await page.locator('input[type="file"]').first().setInputFiles(filePath)
  await page.getByRole('button', { name: /Upload/i }).click()
  await expect(page.getByText(/Avatar enviado|upload concluido|upload/i)).toBeVisible()
})
