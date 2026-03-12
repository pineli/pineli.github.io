const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8080/articles/conferencia-iot-2021');

  // Wait for the terminal to boot and process the command
  await page.waitForTimeout(2000);

  const title = await page.title();
  const description = await page.$eval('meta[name="description"]', el => el.content).catch(() => 'No description meta tag found');
  const url = page.url();

  console.log(`URL: ${url}`);
  console.log(`Title: ${title}`);
  console.log(`Description: ${description}`);

  await browser.close();
})();
