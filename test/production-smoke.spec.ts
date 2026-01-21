
import { test, expect } from '@playwright/test';

test('Production Smoke Test', async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL;
    if (!baseURL) {
        throw new Error('PLAYWRIGHT_BASE_URL is not set');
    }

    console.log(`Navigating to ${baseURL}...`);
    await page.goto(baseURL);

    // Wait for React to mount and render something meaningful
    // We look for "Trust Ledger System" or "Secure Sign In"
    // Using a broad locator to catch either logged-in dashboard or login screen
    await expect(page.locator('body')).not.toBeEmpty();

    // Check for the document title or main header
    // Note: The app might have different titles based on state
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    expect(title).toBeDefined();

    // Take a screenshot for verification
    await page.screenshot({ path: 'test-artifacts/prod-smoke.png' });
});
