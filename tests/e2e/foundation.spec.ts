import { expect, test } from '@playwright/test'

test('protects the Nouri operations workspace', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /sign in to nouri/i })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('loads database-backed packages on the public order page', async ({ page }) => {
  await page.goto('/order?utm_source=tiktok&utm_campaign=e2e')
  await expect(page.getByRole('heading', { name: /choose your nouri package/i })).toBeVisible()
  await expect(page.getByLabel(/1 Pack/)).toBeVisible()
  await expect(page.getByLabel(/2 Packs/)).toBeVisible()
  await expect(page.getByLabel(/3 Packs/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Place order' })).toBeEnabled()
})
