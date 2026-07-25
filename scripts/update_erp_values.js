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

  // Login
  await page.goto(ERP_SITE);
  await page.fill('#tcusr', ERP_USERNAME);
  await page.fill('#tcpwd', ERP_PASSWORD);
  await Promise.all([
    page.waitForNavigation(),
    page.click("input[name='login']")
  ]);

  // Navigate to Enquiry Report
  await page.waitForSelector('#r4c1', { state: 'visible' });
  await page.click('#r4c1');
  await page.waitForTimeout(500);
  await page.click('#r4c2');
  await page.waitForTimeout(500);
  await page.click('#r3c4');

  await page.waitForSelector('#tcfrmdt', { state: 'visible' });

  // Download the report
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.click('#btnexp')
  ]);

  await download.saveAs(REPORT_FILE_PATH);
  console.log("Download complete.");
  await browser.close();
}

function processEnquiryValues() {
  console.log("Extracting Master Enquiry Number and Final Quote Values...");
  let htmlString = fs.readFileSync(REPORT_FILE_PATH, 'utf8');

  // Node xlsx library can parse HTML tables directly
  const workbook = XLSX.read(htmlString, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Try parsing to JSON. The header is usually at row 8 (index 7). 
  // Wait, if it's an HTML table, XLSX reads it straight into JSON.
  let data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Find the header row (contains 'Master Enq No')
  let headerIndex = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && data[i].includes('Master Enq No')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error("Could not find header row in the report.");
    return {};
  }

  const headers = data[headerIndex];
  const rows = data.slice(headerIndex + 1);

  const enqIdx = headers.indexOf('Master Enq No');
  const quoteValIdx = headers.indexOf('Quote Value');
  const finalQuoteValIdx = headers.indexOf('Final Quote Value');

  let enqValues = {};
  for (const row of rows) {
    if (!row || !row[enqIdx]) continue;
    
    let enqNo = String(row[enqIdx]).trim();
    let val1 = parseFloat(row[quoteValIdx]) || 0;
    let val2 = parseFloat(row[finalQuoteValIdx]) || 0;
    
    let finalVal = val2 > 0 ? val2 : val1;
    if (enqNo && finalVal > 0) {
      enqValues[enqNo] = finalVal;
    }
  }
  
  return enqValues;
}

async function updateSupabaseJobs(enqValues) {
  console.log("Connecting to Supabase to update jobs with missing values...");
  
  // Fetch jobs where quote_value is null or 0
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=id,enq_number&or=(quote_value.is.null,quote_value.eq.0)`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch jobs: ${res.statusText}`);
  }

  const jobs = await res.json();
  if (!jobs || jobs.length === 0) {
    console.log("No jobs found with missing values.");
    return;
  }

  let updates = 0;
  for (const job of jobs) {
    let enq = job.enq_number;
    if (!enq) continue;

    let matchedVal = enqValues[enq];
    if (!matchedVal) {
      for (const [repEnq, val] of Object.entries(enqValues)) {
        if (repEnq.includes(enq) || enq.includes(repEnq)) {
          matchedVal = val;
          break;
        }
      }
    }

    if (matchedVal) {
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${job.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ quote_value: matchedVal })
      });
      if (updateRes.ok) {
        updates++;
      } else {
        console.error(`Failed to update job ${job.id}`);
      }
    }
  }
  
  console.log(`Successfully updated ${updates} jobs with enquiry values!`);
}

async function main() {
  try {
    await downloadEnquiryReport();
    const enqValues = processEnquiryValues();
    await updateSupabaseJobs(enqValues);
  } catch (error) {
    console.error("Error during sync:", error);
    process.exit(1);
  }
}

main();
