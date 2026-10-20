import { expect, test } from '@playwright/test'

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true })

  async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
    const hasOverflow = await page.evaluate<boolean>(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(hasOverflow).toBe(false)
  }

  test('keeps the public ordering journey usable at a phone width', async ({ page }) => {
    await page.goto('/order?utm_source=tiktok&utm_campaign=mobile-e2e')

    await expect(page.getByRole('heading', { name: /choose your nouri package/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Place order' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('keeps sign-in usable at a phone width', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /sign in to nouri/i })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
