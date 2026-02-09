import { test, expect } from '@playwright/test';

test('Verify Clear.Flow Splash Screen', async ({ page }) => {
    // 1. Load the App (which we have temporarily forced to show Splash)
    await page.goto('http://localhost:3000/index-unified.html');

    // 2. Verify Title
    await expect(page).toHaveTitle(/Trust Ledger/);

    // 3. Verify Splash Screen Elements (The "Visual Cue")
    // We expect to see "Choose your experience"
    await expect(page.getByText('Choose your experience')).toBeVisible();

    // 4. Verify "Clear.Flow" Option
    await expect(page.getByText('Clear.Flow', { exact: true })).toBeVisible();
    // Verify "Ledger" Option
    await expect(page.getByText('Ledger', { exact: true })).toBeVisible();

    // 5. Capture the Proof
    await page.screenshot({ path: 'verification-splash-screen.png' });

    console.log('Verified: Dual Entry Splash Screen with Clear.Flow and Ledger options.');
});
