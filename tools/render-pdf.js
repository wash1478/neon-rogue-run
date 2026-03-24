const puppeteer = require('puppeteer');
const fs = require('fs');
(async ()=>{
  const html = 'file://' + require('path').resolve('health-checklist/checklist.html');
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto(html, {waitUntil:'networkidle0'});
  await page.pdf({path:'health-checklist/checklist.pdf', format:'A4', printBackground:true});
  await browser.close();
})();
