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

  // Set From Date to capture all enquiries for the financial year
  console.log("Setting date range (01-Apr-2026)...");
  await page.fill('#tcfrmdt', '01-Apr-2026');
  await page.waitForTimeout(1000);

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

  const workbook = XLSX.read(htmlString.trim(), { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Use defval: "" to guarantee column indices remain perfectly aligned even if cells are empty!
  let data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  
  if (data.length <= 8) {
    console.error("Report does not contain enough rows.");
    return {};
  }

  // Row 8 is header (index 7), so data starts at index 8 (row 9)
  const rows = data.slice(8);

  // Column J = index 9, BA = index 52, BB = index 53
  const enqIdx = 9;
  const quoteValIdx = 52;
  const finalQuoteValIdx = 53;

  let enqValues = {};
  for (const row of rows) {
    if (!row || row.length <= enqIdx) continue;
    
    let enqNo = String(row[enqIdx] || '').trim();
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?select=job_number,enq_number&or=(quote_value.is.null,quote_value.eq.0)`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch jobs: ${res.statusText} - ${errorText}\n\n⚠️ IMPORTANT: Did you run the SQL command 'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_value NUMERIC;' in Supabase?`);
  }

  const jobs = await res.json();
  if (!jobs || jobs.length === 0) {
    console.log("No jobs found with missing values.");
    return;
  }
  
  console.log(`Found ${jobs.length} jobs in Supabase needing value updates.`);

  const cleanEnq = str => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  let updates = 0;
  for (const job of jobs) {
    let enq = String(job.enq_number || '').trim();
    if (!enq) continue;

    let matchedVal = enqValues[enq];
    if (!matchedVal) {
      const cleanedEnq = cleanEnq(enq);
      for (const [repEnq, val] of Object.entries(enqValues)) {
        const cleanedRep = cleanEnq(repEnq);
        if (cleanedRep && cleanedEnq && (cleanedRep.includes(cleanedEnq) || cleanedEnq.includes(cleanedRep))) {
          matchedVal = val;
          break;
        }
      }
    }

    if (matchedVal) {
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/jobs?job_number=eq.${encodeURIComponent(job.job_number)}`, {
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
        console.error(`Failed to update job ${job.job_number}`);
      }
    }
  }
  
  console.log(`Successfully updated ${updates} jobs with enquiry values!`);
}

async function main() {
  try {
    await downloadEnquiryReport();
    const enqValues = processEnquiryValues();
    console.log(`Extracted ${Object.keys(enqValues).length} valid quote values from the report.`);
    await updateSupabaseJobs(enqValues);
  } catch (error) {
    console.error("Error during sync:", error);
    process.exit(1);
  }
}

main();
