const { chromium } = require('playwright');
const XLSX = require('xlsx');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ERP_SITE = process.env.ERP_SITE;
const ERP_USERNAME = process.env.ERP_USERNAME;
const ERP_PASSWORD = process.env.ERP_PASSWORD;

const REPORT_FILE_PATH = 'ti_enquiry_report.xls';

async function downloadEnquiryReport() {
  console.log("Downloading Enquiry Report from ERP...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  await page.goto(ERP_SITE);
  await page.fill('#tcusr', ERP_USERNAME);
  await page.fill('#tcpwd', ERP_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.click("input[name='login']")
  ]);

  await page.waitForSelector('#r4c1', { state: 'visible' });
  await page.click('#r4c1');
  await page.waitForTimeout(500);
  await page.click('#r4c2');
  await page.waitForTimeout(500);
  await page.click('#r3c4');

  await page.waitForSelector('#tcfrmdt', { state: 'visible' });

  // Use 2024 to get everything
  await page.fill('#tcfrmdt', '01-Apr-2024');
  await page.waitForTimeout(1000);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.click('#btnexp')
  ]);

  await download.saveAs(REPORT_FILE_PATH);
  console.log("Download complete.");
  await browser.close();
}

async function debug() {
  // 1. Get Supabase jobs missing quote values
  console.log("Fetching jobs from Supabase...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=job_number,enq_number&or=(quote_value.is.null,quote_value.eq.0)&limit=5000`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const jobs = await res.json();
  console.log(`Found ${jobs.length} jobs in Supabase missing quote values.`);

  // 2. Download report if not exists
  if (!fs.existsSync(REPORT_FILE_PATH)) {
    await downloadEnquiryReport();
  } else {
    console.log("Using cached enquiry report.");
  }

  // 3. Parse report
  console.log("Parsing ERP Report...");
  let htmlString = fs.readFileSync(REPORT_FILE_PATH, 'utf8');
  const workbook = XLSX.read(htmlString.trim(), { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  let data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  
  const rows = data.slice(8);
  const enqIdx = 9;
  const quoteValIdx = 52;
  const finalQuoteValIdx = 53;

  let erpList = [];
  for (const row of rows) {
    if (!row || row.length <= enqIdx) continue;
    let enqNo = String(row[enqIdx] || '').trim();
    if (!enqNo) continue;
    
    let rawQuote = String(row[quoteValIdx] || '');
    let rawFinal = String(row[finalQuoteValIdx] || '');
    
    let val1 = parseFloat(rawQuote.replace(/,/g, '')) || 0;
    let val2 = parseFloat(rawFinal.replace(/,/g, '')) || 0;
    let finalVal = val2 > 0 ? val2 : val1;
    
    erpList.push({
      enqNo,
      rawQuote,
      rawFinal,
      finalVal
    });
  }

  console.log(`Parsed ${erpList.length} rows from ERP Report.`);

  const cleanEnq = str => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  // 4. Generate CSV
  let csv = "Job Number,Supabase Enq Number,ERP Match Found?,Matched ERP Enq Number,Raw ERP Quote Value,Raw ERP Final Quote Value,Calculated Final Value\n";

  let matchCount = 0;
  for (const job of jobs) {
    let enq = String(job.enq_number || '').trim();
    if (!enq) continue;

    let cleanedEnq = cleanEnq(enq);
    let matchedRow = erpList.find(r => {
      let cleanedRep = cleanEnq(r.enqNo);
      return cleanedRep && cleanedEnq && (cleanedRep.includes(cleanedEnq) || cleanedEnq.includes(cleanedRep));
    });

    if (matchedRow) {
      matchCount++;
      csv += `${job.job_number},${enq},YES,${matchedRow.enqNo},"${matchedRow.rawQuote}","${matchedRow.rawFinal}",${matchedRow.finalVal}\n`;
    } else {
      csv += `${job.job_number},${enq},NO,N/A,N/A,N/A,N/A\n`;
    }
  }

  fs.writeFileSync('debug_report.csv', csv);
  console.log(`Debug report generated at debug_report.csv. Matched ${matchCount}/${jobs.length} jobs.`);
}

debug().catch(console.error);
