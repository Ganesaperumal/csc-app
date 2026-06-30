const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { chromium } = require('playwright');

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;
const ERP_SITE = process.env.ERP_SITE;
const ERP_USERNAME = process.env.ERP_USERNAME;
const ERP_PASSWORD = process.env.ERP_PASSWORD;
const API_URL = process.env.API_URL || 'https://your-vercel-app-url.vercel.app/api/ingest-erp'; // Must be set in GitHub Secrets!

if (!CRON_SECRET_KEY || !ERP_SITE || !ERP_USERNAME || !ERP_PASSWORD) {
  console.error('Error: Missing required environment variables (ERP credentials or CRON_SECRET_KEY).');
  process.exit(1);
}

async function downloadActiveJobs() {
  const downloadPath = path.resolve(__dirname, 'ti_unbilled_jobs.xls');

  console.log('🌐 Launching headless browser to download live ERP data...');
  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1920, height: 1080 }
  });
  
  context.setDefaultTimeout(120000);
  const page = await context.newPage();

  try {
    console.log(`🔐 Logging into ERP: ${ERP_SITE}`);
    await page.goto(ERP_SITE);
    await page.fill('#tcusr', ERP_USERNAME);
    await page.fill('#tcpwd', ERP_PASSWORD);
    await page.click("input[name='login']");
    await page.waitForSelector('#r3c1', { timeout: 60000 });
    
    console.log('📂 Navigating to Job Register...');
    await page.click('#r3c1'); // Queries
    await page.click('#r6c2'); // Job
    await page.click('#r6c3'); // Job Register
    
    await page.waitForSelector('#tccap', { state: 'visible' });
    await page.selectOption('#tccap', 'S');
    
    console.log('📅 Setting date range (01-Apr-2026 to Today)...');
    await page.fill('#tcfrmdt', '01-Apr-2026');
    
    const today = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;
    await page.fill('#tctodt', formattedToday);
    
    console.log('⬇️ Downloading report...');
    await page.waitForSelector('#btnexport', { state: 'attached' });
    const downloadPromise = page.waitForEvent('download');
    await page.click('#btnexport');
    const download = await downloadPromise;
    await download.saveAs(downloadPath);
    console.log('✅ Download complete!');
    
    return downloadPath;
  } catch (error) {
    console.error('❌ Browser automation failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function syncERP() {
  let excelFilePath = null;
  try {
    excelFilePath = await downloadActiveJobs();

    console.log('1. Reading Excel file...');
    if (!fs.existsSync(excelFilePath)) {
      console.error(`File not found at ${excelFilePath}.`);
      return;
    }

    let fileContent = fs.readFileSync(excelFilePath, 'utf8');
    const workbook = xlsx.read(fileContent.trim(), { type: 'string' });
    const sheetName = workbook.SheetNames[0]; 
    const sheet = workbook.Sheets[sheetName];

    const rawData = xlsx.utils.sheet_to_json(sheet, { range: 6, defval: "" });
    console.log(`Found ${rawData.length} rows in the Excel sheet.`);

    const formattedData = rawData.map(row => ({
      job_number: row['Job No'],
      erp_job_id: row['Job ID'] ? parseInt(row['Job ID'], 10) : null,
      enq_number: row['Master Enq No'] || '',
      job_date: row['Order Recd Dt'] || null,
      branch: row['BRN'] || '',
      customer_name: row['Name'] || '',
      company: row['Company'] || '',
      goods_type: row['Type Of Goods'] || '',
      origin: row['From'] || row['Origin'] || '',
      destination: row['To'] || row['Destination'] || '',
      customer_phone: row['Phone'] || '',
      erp_status: row['Status'] || 'Active'
    })).filter(row => {
      const status = String(row.erp_status || '').trim().toUpperCase();
      return (
        row.job_number && 
        row.enq_number !== 'EN/0/26/' && 
        row.enq_number !== 'EN/0/25/' &&
        status !== 'BILLED' && 
        status !== 'CANCELED' && 
        status !== 'CANCELLED'
      );
    });

    if (formattedData.length === 0) {
      console.log('No valid active jobs found. Exiting.');
      return;
    }

    console.log(`Sending ${formattedData.length} valid jobs to the API...`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET_KEY}`
      },
      body: JSON.stringify(formattedData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Sync Successful:', result.message);
    } else {
      console.error('❌ Sync Failed:', result.error);
    }
  } catch (err) {
    console.error('❌ Fatal Error during Sync:', err);
  } finally {
    if (excelFilePath && fs.existsSync(excelFilePath)) {
      fs.unlinkSync(excelFilePath);
    }
  }
}

syncERP();
