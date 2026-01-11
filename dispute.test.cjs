
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

(async function disputeTest() {
  let options = new chrome.Options();
  options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  try {
    // Start the app
    console.log('Navigating to http://localhost:5173');
    await driver.get('http://localhost:5173');

    // Wait for the app to load
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Ens Legis')]")), 15000);
    console.log('App loaded successfully.');

    // Navigate to Credit Defense
    let creditDefenseLink = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Credit Defense')]")), 5000);
    await creditDefenseLink.click();
    console.log('Clicked on Credit Defense link.');

    // Select the 'Dispute' tab
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Dispute']")), 5000).click();
    console.log('Clicked on Dispute tab.');

    // Fill out the dispute form
    let input = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='e.g. Account #1234-5678 (Acme Bank)']")), 5000);
    await input.sendKeys('Fraudulent Inquiry');
    
    let textarea = await driver.findElement(By.xpath("//textarea[@placeholder='Explain why this item is inaccurate, unverifiable, or obsolete...']"));
    await textarea.sendKeys('This inquiry was not authorized and is impacting our credit profile.');
    console.log('Filled out dispute form.');

    // Click the "Generate Instrument" button
    let generateBtn = await driver.findElement(By.xpath("//button[contains(., 'Generate Instrument')]"));
    await generateBtn.click();
    console.log('Clicked on Generate Instrument button.');

    // Verify that the dispute document is generated
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'NOTICE OF DISPUTE') or contains(text(), 'Dispute Letter')]")), 15000);
    console.log('Dispute document generated successfully.');

    // Click the "Finalize & Record" button
    let finalizeBtn = await driver.findElement(By.xpath("//button[contains(., 'Finalize & Record')]"));
    await finalizeBtn.click();
    console.log('Clicked on Finalize & Record button.');

    // Verify success message
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Successfully recorded')]")), 10000);
    console.log('Dispute recorded successfully.');

  } catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
  } finally {
    await driver.quit();
  }
})();
