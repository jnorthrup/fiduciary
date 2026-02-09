import { test, expect } from '@playwright/test';

test('Verify Clear.Flow Personal Finance UI', async ({ page }) => {
    // 1. Load the Unified Entry Point with the Test User Backdoor
    // This bypasses the Google Login screen and injects a user.
    // We also set the skin to 'lastrust' (Clear.Flow) via localStorage script

    await page.addInitScript(() => {
        localStorage.setItem('fiduciary_selected_skin', 'lastrust');
    });

    // Use the ?__test_user= param to trigger the auth backdoor
    await page.goto('http://localhost:3005/index-unified.html?__test_user=verif_user');

    // DEBUG: Wait a moment for hydration
    await page.waitForTimeout(3000);

    // 2. Verify "Clear.Flow" branding in Sidebar
    await expect(page.getByText('Clear.Flow').first()).toBeVisible();
    await expect(page.getByText('Personal Finance').first()).toBeVisible();

    // 3. Verify Dashboard Title
    await expect(page.getByText('Personal Overview')).toBeVisible();

    // 4. Verify Personal Finance Metric Labels
    await expect(page.getByText('Net Liquidity')).toBeVisible();
    await expect(page.getByText('In Flight')).toBeVisible();
    await expect(page.getByText('Credit Debt')).toBeVisible();

    // 5. Verify Navigation Items
    await expect(page.getByRole('button', { name: 'Payments' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Loans' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profile' })).toBeVisible();

    // Capture screenshot for proof
    await page.screenshot({ path: 'clearflow_personal_finance.png' });
    console.log('Verified: Clear.Flow Personal Finance UI is active and distinct.');
});
