import { test, expect } from '@playwright/test';

test('Verify Clear.Flow Access From Dual Splash', async ({ page }) => {
    // 1. Force Dual Splash by clearing storage
    await page.addInitScript(() => {
        localStorage.removeItem('fiduciary_selected_skin');
        localStorage.removeItem('fiduciary_skin_v2');
    });

    // 2. Load Root with Auth Backdoor (Port 3003)
    await page.goto('http://localhost:3003/?__test_user=flow_verifier');

    // DEBUG: Wait for hydration
    await page.waitForTimeout(3000);

    // 3. Verify Dual Splash
    await expect(page.getByText('Choose your experience')).toBeVisible();

    // 4. Click "Clear.Flow" (Personal Finance)
    const clearflowBtn = page.getByRole('button', { name: /Clear.Flow/i }).first();
    await clearflowBtn.click();

    // 5. Verify Transition to Personal Finance UI
    // Wait for the UI to switch (React Suspense might take a moment)
    await page.waitForTimeout(2000);

    // 6. Assert Personal Finance Elements
    await expect(page.getByText('Personal Overview')).toBeVisible();
    await expect(page.getByText('Net Liquidity')).toBeVisible();

    // 7. Assert ABSENCE of Entity/Ledger Elements (Jnorthrup UI)
    // "NCUA Charter" or "System Overview" should NOT be visible
    await expect(page.getByText('System Overview')).not.toBeVisible();
    await expect(page.getByText('NCUA Charter')).not.toBeVisible();

    // Capture visual proof
    await page.screenshot({ path: 'dual_splash_to_clearflow_success.png' });
    console.log('Verified: Dual Splash correctly routed to Clear.Flow Personal Finance UI.');
});
