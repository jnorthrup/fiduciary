
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async function disputeTest() {
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless())
    .build();
  try {
    // Start the app
    await driver.get('http://localhost:3000'); // Assuming the app runs on port 3000

    // Navigate to Credit Defense Wizard (assuming a button/link with this text)
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Credit Defense')]")), 10000).click();

    // Select the 'Dispute' tab
    await driver.findElement(By.xpath("//button[text()='Dispute']")).click();

    // Fill out the dispute form
    await driver.findElement(By.xpath("//input[@placeholder='e.g. Account #1234-5678 (Acme Bank)']")).sendKeys('Fraudulent Inquiry');
    await driver.findElement(By.xpath("//textarea[@placeholder='Explain why this item is inaccurate, unverifiable, or obsolete...']")).sendKeys('This inquiry was not authorized and is impacting our credit profile.');

    // Click the "Generate Instrument" button
    await driver.findElement(By.xpath("//button[contains(., 'Generate Instrument')]")).click();

    // Verify that the dispute document is generated
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'NOTICE OF DISPUTE')]")), 10000);
    console.log('Dispute document generated successfully.');

    // Click the "Finalize & Record" button
    await driver.findElement(By.xpath("//button[contains(., 'Finalize & Record')]")).click();

    // Verify that the action has been recorded
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Action Recorded')]")), 10000); // This assumes a confirmation message appears
    console.log('Dispute recorded successfully.');

  } finally {
    await driver.quit();
  }
})();
