const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const pages = [
    { url: 'http://localhost:3000', name: 'homepage' },
    { url: 'http://localhost:3000/login', name: 'login' },
    { url: 'http://localhost:3000/register', name: 'register' },
  ];

  for (const p of pages) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.screenshot({ path: `screenshots/${p.name}.png`, fullPage: true });
      console.log(`Saved: ${p.name}.png`);
    } catch (e) {
      console.error(`Failed: ${p.name} - ${e.message}`);
    }
  }

  await browser.close();
})();
