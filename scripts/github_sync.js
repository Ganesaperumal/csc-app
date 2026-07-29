const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { chromium } = require('playwright');

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY;
const ERP_SITE = process.env.ERP_SITE;
const ERP_USERNAME = process.env.ERP_USERNAME;
const ERP_PASSWORD = process.env.ERP_PASSWORD;
const API_URL = process.env.API_URL || 'https://your-vercel-app-url.vercel.app/api/ingest-erp'; // Must be set in GitHub Secrets!

const http = require('http');
const https = require('https');

if (!CRON_SECRET_KEY || !ERP_SITE || !ERP_USERNAME || !ERP_PASSWORD) {
  console.error('Error: Missing required environment variables (ERP credentials or CRON_SECRET_KEY).');
  process.exit(1);
}

function sendPostRequest(targetUrl, payloadString, token, redirects = 0) {
  if (redirects > 5) {
    return Promise.reject(new Error('Too many redirects'));
  }
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const transport = urlObj.protocol === 'https:' ? https : http;
    const bodyBuffer = Buffer.from(payloadString, 'utf-8');

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBuffer.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = transport.request(options, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, targetUrl).toString();
        return sendPostRequest(redirectUrl, payloadString, token, redirects + 1).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ message: data });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(bodyBuffer);
    req.end();
  });
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
    page.on('dialog', async dialog => {
      console.log(`⚠️ Alert appeared: ${dialog.message()}`);
      await dialog.accept();
    });

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

    // Short wait to see if it redirects to error page
    await page.waitForTimeout(2000);
    if (page.url().includes('tnerr=')) {
      throw new Error(`ERP returned error in URL: ${page.url()}`);
    }
    
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

async function downloadActiveJobsWithRetry(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await downloadActiveJobs();
    } catch (err) {
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      console.log('🔄 Retrying in 10 seconds...');
      await new Promise(res => setTimeout(res, 10000));
    }
  }
}

async function syncERP() {
  let excelFilePath = null;
  try {
    excelFilePath = await downloadActiveJobsWithRetry();

    console.log('1. Reading Excel file...');
    if (!fs.existsSync(excelFilePath)) {
      console.error(`File not found at ${excelFilePath}.`);
      return;
    }

    let fileContent = fs.readFileSync(excelFilePath, 'utf8');
    const workbook = xlsx.read(fileContent.trim(), { type: 'string' });
    const sheetName = workbook.SheetNames[0]; 
    const sheet = workbook.Sheets[sheetName];

    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    console.log(`Found ${rawData.length} rows in the Excel sheet.`);

    const parseExcelDate = (val) => {
      if (!val) return null;
      const str = String(val).trim();
      if (str === '' || str === '-' || str.toLowerCase() === 'n/a') return null;

      // If it's an Excel serial number (numeric), convert using xlsx utility
      const num = Number(str);
      if (!isNaN(num) && num > 1000 && num < 100000) {
        try {
          const parsed = xlsx.SSF.parse_date_code(num);
          if (parsed && parsed.y) {
            const m = String(parsed.m).padStart(2, '0');
            const d = String(parsed.d).padStart(2, '0');
            return `${parsed.y}-${m}-${d}`;
          }
        } catch (e) {}
        return null;
      }

      // Otherwise try parsing as a date string (e.g. "02-Apr-26")
      const d = new Date(str);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1990 && d.getFullYear() < 2100) {
        return d.toISOString().split('T')[0];
      }
      return null;
    };

    const formattedData = rawData.map(row => {
      // row is an array of strings since we used { header: 1 }
      return {
        erp_job_id: row[1] ? parseInt(row[1], 10) : null,
        branch: row[2] ? String(row[2]).trim() : '',
        job_number: row[3] ? String(row[3]).trim() : '',
        enq_number: row[4] ? String(row[4]).trim() : '',
        origin: row[7] || row[24] || '', // Origin or From
        destination: row[8] || row[25] || '', // Destination or To
        erp_status: row[9] || 'Active',
        job_date: parseExcelDate(row[10]), // Order Recd Dt
        customer_name: row[20] || '', // Name
        company: row[21] || '', // Company
        customer_phone: row[22] || row[23] || '', // Phone or Mobile
        goods_type: row[28] || '', // Type Of Goods
        invoice_number: row[18] ? String(row[18]).trim() : null, // Bill No
        invoice_date: parseExcelDate(row[19]), // Bill Dt
      };
    }).filter(row => {
      const jobNo = String(row.job_number || '').trim();
      const enqNo = String(row.enq_number || '').trim();
      
      return (
        jobNo && 
        jobNo.startsWith('JB/') && // Ensures it's a valid Job Number row, skipping headers!
        enqNo !== 'EN/0/26/' && 
        enqNo !== 'EN/0/25/'
      );
    });

    if (formattedData.length === 0) {
      console.log('No valid active jobs found. Exiting.');
      return;
    }

    console.log(`Sending ${formattedData.length} valid jobs to the API in batches...`);

    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(formattedData.length / BATCH_SIZE);
    for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
      const batch = formattedData.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      const isLastBatch = batchIndex === totalBatches;

      // Wrap in envelope so the API knows when to unlock sync_lock
      const payload = { jobs: batch, is_last_batch: isLastBatch };
      const jsonBody = JSON.stringify(payload);

      console.log(`Sending batch ${batchIndex} of ${totalBatches} (${batch.length} jobs)${isLastBatch ? ' [LAST BATCH]' : ''}...`);

      const result = await sendPostRequest(API_URL, jsonBody, CRON_SECRET_KEY);
      console.log(`✅ Batch ${batchIndex} Sync Successful:`, result.message || 'OK');
    }
  } catch (err) {
    console.error('❌ Fatal Error during Sync:', err);
    // Emergency unlock if it failed before reaching the API
    try {
      const unlockUrl = API_URL.replace('/ingest-erp', '/admin/delete-jobs').replace('delete-jobs', 'unlock-sync');
      await sendPostRequest(unlockUrl, '{}', CRON_SECRET_KEY);
    } catch(e) {}
  } finally {
    if (excelFilePath && fs.existsSync(excelFilePath)) {
      fs.unlinkSync(excelFilePath);
    }
  }
}
syncERP().then(() => {
  console.log('🏁 Script finished. Exiting process.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Script failed. Exiting process.', err);
  process.exit(1);
});
