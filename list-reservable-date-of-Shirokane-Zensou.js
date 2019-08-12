'use strict'

const log4js = require('log4js');
const logger = log4js.getLogger();
log4js.configure({
  appenders: {
    err: { type: 'stderr' }
  },
  categories: {
    default: { appenders: ['err'], level: 'ERROR' }
  }
});

logger.level = 'warn';

/**
 * Show usage of this script and exit from the script
 */
function showUsageAndExit() {
  const usage = `Usage: node ${require("path").relative(process.cwd(), __filename)}

List reservable date of Shirokane Zensou (白金然荘).`;
  console.info(usage);
  process.exit(1);
}

if (process.argv.length === 3 && ['--verbose', '-v'].includes(process.argv[2])) {
  logger.level = 'debug';
} else if (process.argv.length > 2) {
  showUsageAndExit();
}

const main = async () => {
  const puppeteer = require('puppeteer');
  logger.debug('Launch Puppeteer');
  const browser = await puppeteer.launch();

  logger.debug('Open new page');
  const page = await browser.newPage();

  const URL = require('url').URL;
  const RSV_PAGE_URL = new URL('https://rsv.ebica.jp/ebica2/webrsv/rsv_plans/?cltid=e014007601&shop=3991');

  logger.debug('Check that robots.txt exists or not');
  const ROBOTS_URL = RSV_PAGE_URL.origin + '/robots.txt';
  const robots_response = await page.goto(ROBOTS_URL);
  if (robots_response.ok()) {
    logger.error(ROBOTS_URL + ' exists, so PLEASE force me to behave based on the parse result of the file');
    await browser.close();
    return;
  }

  logger.debug('Open reservation page');
  const rsv_page_response = await page.goto(RSV_PAGE_URL);
  if (!rsv_page_response.ok()) {
    logger.error('Got error response code ' + rsv_page_response.status + ' from reservation page');
    await browser.close();
    return;
  }

  logger.debug('Search a div element that has target reservation plan from multiple plans');
  await page.waitForSelector('div.shadowBox');
  let divElements = await page.$$('div.shadowBox');
  console.log('divElements: ', divElements);
  console.log('divElements length: ', divElements.length);
  let targetDivElement;
  for (const divElm of divElements) {
    let str = await divElm.getProperty('textContent');
    if (str.toString().includes('4階半個室貸切')) {
      targetDivElement = divElm;
    }
  }

  logger.debug('Display reservation calendar');
  let inputElement = await targetDivElement.$('input');
  await inputElement.click();
  let divDatePicker = await page.waitForSelector('div#ui-datepicker-div');

  logger.debug('Get reservable date list');
  let reservableDateStrList = await divDatePicker.$$eval('td', tdList => {
    let dateStringList = [];
    for (const td of tdList) {
      if (td.classList.contains('ui-datepicker-unselectable')) {
        continue;
      }

      let year = td.attributes.getNamedItem('data-year').value;
      // "data-month" attribute's value is one less than the actual month
      let month = String(Number(td.attributes.getNamedItem('data-month').value) + 1);
      let dayOfMonth = td.textContent;

      dateStringList.push(year + '-' + month.padStart(2, '0') + '-' + dayOfMonth.padStart(2, '0'));
    }
    return dateStringList;
  });

  for (const date of reservableDateStrList) {
    console.log(date);
  }

  await browser.close();
};

(async () => {
  try {
    await main();
  } catch (e) {
    logger.error('Failed to run script', e);
    process.exit(1);
  }
})();
