import { test, expect } from '@playwright/test';

test('Visual Verification of Documents Use Case', async ({ page }) => {
    // 1. Simulating User A (Owner)
    console.log('Starting User A Session...');
    await page.goto('http://localhost:3000/index-unified.html?__test_user=user_a');

    // Select Experience if prompted (might be skipped if we set skin in localStorage, let's do that)
    await page.evaluate(() => localStorage.setItem('fiduciary_selected_skin', 'lastrust'));
    await page.reload();

    // Verify Dashboard
    await expect(page.getByText('Lastrust Dashboard')).toBeVisible();

    // Go to Documents
    const railTab = page.getByText('Rail', { exact: true }); // Sidebar item? No, Nav is "Rail"
    // Actually the sidebar has "Rail". 
    // And inside Rail page there are tabs.
    // Let's navigate directly to be safe, now that we are "authed"
    await page.goto('http://localhost:3000/rail/documents?__test_user=user_a');

    // Verify Access
    await expect(page.getByText('My Files')).toBeVisible();
    await expect(page.getByText('user_a@example.com')).toBeVisible();
    await expect(page.getByText('No documents found')).toBeVisible();

    // Upload a File
    await page.getByText('Upload Receipt').click();
    await expect(page.getByText('Uploaded receipt_')).toBeVisible(); // Success toast

    // Verify File in List
    await expect(page.getByText('KB •')).toBeVisible(); // File size indicator

    // Screenshot User A View
    await page.screenshot({ path: 'verification-user-a-documents.png' });

    // 2. Simulating User B (Intruder/Other)
    console.log('Starting User B Session...');
    // Clear state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.removeItem('fiduciary_selected_skin'));

    await page.goto('http://localhost:3000/index-unified.html?__test_user=user_b');
    await page.evaluate(() => localStorage.setItem('fiduciary_selected_skin', 'lastrust'));
    await page.reload();

    await page.goto('http://localhost:3000/rail/documents?__test_user=user_b');

    // Verify Isolation
    await expect(page.getByText('user_b@example.com')).toBeVisible();

    // Crucial Check: User B should NOT see User A's file
    // We expect "No documents found" again
    await expect(page.getByText('No documents found')).toBeVisible();

    // Screenshot User B View
    await page.screenshot({ path: 'verification-user-b-documents.png' });

    console.log('Verified: User A data is invisible to User B via UI.');
});
