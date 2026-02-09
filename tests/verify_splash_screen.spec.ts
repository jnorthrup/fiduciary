import { test, expect } from '@playwright/test';

test('Verify Dual Splash Screen', async ({ page }) => {
    // 1. Clear any stored skin preference to FORCE the splash screen
    await page.addInitScript(() => {
        localStorage.removeItem('fiduciary_selected_skin');
    });

    // 2. Load Unified Entry with Auth Backdoor
    await page.goto('http://localhost:3005/index-unified.html?__test_user=splash_verifier');

    // DEBUG: Wait for hydration
    await page.waitForTimeout(3000);

    // 3. Verify Global Elements
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByText('Choose your experience')).toBeVisible();

    // 4. Verify App 1: Ledger
    const ledgerBtn = page.getByRole('button', { name: /Ledger/i }).first();
    await expect(ledgerBtn).toBeVisible();
    await expect(page.getByText('Entity-focused dashboard')).toBeVisible();

    // 5. Verify App 2: Clear.Flow
    const clearflowBtn = page.getByRole('button', { name: /Clear.Flow/i }).first();
    await expect(clearflowBtn).toBeVisible();
    await expect(page.getByText('Modern financial rail')).toBeVisible();

    // Capture visual proof of the "Two Unrelated Apps" choice
    await page.screenshot({ path: 'dual_app_splash_screen.png' });
    console.log('Verified: Dual Splash Screen is visible with distinct choices.');
});
