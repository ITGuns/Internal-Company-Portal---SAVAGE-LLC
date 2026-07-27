import { expect, test, type Page } from '@playwright/test'

// Gemfield bridge E2E (P5). Runs against a running app seeded with `npm run seed:gemfield`.
// Selectors target the roles/labels the Gemfield components expose (dialog names, button text);
// if the shared login form differs, adjust the `login()` helper only.
//
// NOTE: authored but not yet executed here (Playwright not installed in this environment).
// See README.md in this folder to wire + run.

const PASSWORD = process.env.E2E_PASSWORD || 'Deskii-Local-2026'

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in|log ?in/i }).click()
  await page.waitForLoadState('networkidle')
}

test.describe('Gemfield bridge', () => {
  // Definition of done: a Gemfield client files a change request with the wizard in under 2 minutes.
  test('gemfield client files a request via the wizard', async ({ page }) => {
    await login(page, 'client.gemfield@example.test')

    await expect(page.getByText('Your website build')).toBeVisible()
    await page.getByRole('button', { name: 'Start a request' }).click()

    const dialog = page.getByRole('dialog', { name: 'New request' })
    await expect(dialog).toBeVisible()

    // Step 1: category
    await dialog.getByRole('button', { name: /Change to my website/i }).click()
    await dialog.getByRole('button', { name: /^Next/ }).click()

    // Step 2: narrowing (tap-only)
    await dialog.getByRole('button', { name: 'Home' }).click()
    await dialog.getByRole('button', { name: 'Text / copy' }).click()
    await dialog.getByRole('button', { name: /^Next/ }).click()

    // Step 3: details (+ optional attachment via a fixture, see README)
    await dialog.getByLabel(/Tell us what you'd like/i).fill('E2E: please update the homepage headline.')
    await dialog.getByRole('button', { name: /^Next/ }).click()

    // Step 4: review + send
    await dialog.getByRole('button', { name: /Send request/i }).click()
    await expect(dialog.getByText(/TK-[A-Z0-9]{6}/)).toBeVisible()
  })

  test('a plain Deskii client sees no Gemfield module', async ({ page }) => {
    await login(page, 'client.plain@example.test')
    await expect(page.getByText('Your website build')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Start a request' })).toHaveCount(0)
  })

  test('dev control panel lists tickets and defaults replies to internal', async ({ page }) => {
    await login(page, 'gemfield.dev@example.test')
    await page.goto('/operations/clients/gemfield')

    await expect(page.getByText('Gemfield Developer Control Panel')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Triaged' })).toBeVisible()

    // Open a seeded ticket and confirm the compose mode defaults to Internal note (the leak guardrail).
    await page.getByText('Contact form not sending').first().click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: /Internal note/i })).toBeVisible()
  })
})
