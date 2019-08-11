/**
 * Show usage of this script and exit from the script
 */
function showUsageAndExit() {
  const usage = `
Usage: node ${__filename}

List reservable date of Shirokanezenso (白金然荘).
`;
  console.info(usage);
  process.exit(1);
}

if (process.argv.length > 2) {
  showUsageAndExit();
}


(async () => {
  // const puppeteer = require('puppeteer'); // TODO Delete this line if unnecessary
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
  });

  const page = await browser.newPage();

  const URL = require('url').URL;
  const RSV_PAGE_URL = new URL('https://rsv.ebica.jp/ebica2/webrsv/rsv_plans/?cltid=e014007601&shop=3991');
  const ROBOTS_URL = RSV_PAGE_URL.origin + '/robots.txt';
  const robots_response = await page.goto(ROBOTS_URL);
  if (robots_response.ok()) {
    console.error(ROBOTS_URL + ' exists, so PLEASE force me to behave based on the parse result of the file');
    await browser.close();
    return;
  }

  const rsv_page_response = await page.goto(RSV_PAGE_URL);
  if (!rsv_page_response.ok()) {
    console.error('Got error response code ' + rsv_page_response.status + ' from reservation page');
    await browser.close();
    return;
  }

  let listSelector = "div.shadowBox";
  let elements = await page.$$(listSelector);

  for (let i = 0; i < elements.length; i++) {
    let str = await elements[i].getProperty('textContent');
    if (str.toString().includes('4階半個室貸切')) {
      let inputElement = await elements[i].$('input');
      inputElement.click();
      let divDatePicker = await page.waitForSelector('div#ui-datepicker-div');

      let elementsOfSelectableDate = await divDatePicker.$$eval('td', tdList => {
        let foundElements = [];
        for (const td of tdList) {
          let attr = td.attributes.getNamedItem('data-handler');
          if (attr != null) {
            let year = td.attributes.getNamedItem('data-year').value;
            // "data-month" attribute's value is one less than the actual month
            let month = Number(td.attributes.getNamedItem('data-month').value) + 1;
            let dayOfMonth = td.textContent;

            foundElements.push(year + '-' + month + '-' + dayOfMonth);
          }
        }
        return foundElements;
      });

      for (const date of elementsOfSelectableDate) {
        console.log(date);
      }
    }
  }

  await browser.close();
})();
