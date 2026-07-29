/**
 * verify_enq_scraper.js — v2 (uses @supabase/supabase-js)
 * Fetches 10 jobs with KNOWN quote_values, scrapes ERP, compares results.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const ws = require('ws');

const ERP_SITE     = process.env.ERP_SITE;
const ERP_USERNAME = process.env.ERP_USERNAME;
const ERP_PASSWORD = process.env.ERP_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});

function parseEnqNumber(enqNumber) {
  const parts = String(enqNumber || '').split('/');
  if (parts.length !== 4) return null;
  return { prefix: parts[0], searchId: parts[1], year: parts[2], seq: parts[3] };
}

function parseAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/,/g, '').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

async function fetchJobsWithKnownValues() {
  console.log('\n📋 Fetching 10 jobs from Supabase with known quote_value (YY=26)...');

  const { data, error } = await supabase
    .from('jobs')
    .select('job_number, enq_number, quote_value')
    .gt('quote_value', 0)
    .like('enq_number', 'EN/%/26/%')
    .order('quote_value', { ascending: false })
    .limit(10);

  if (error) throw new Error(`Supabase error: ${error.message}`);

  const valid = (data || []).filter(j => parseEnqNumber(j.enq_number)?.year === '26');
  console.log(`   Got ${valid.length} jobs with known quote values\n`);
  valid.forEach((j, i) =>
    console.log(`   ${i + 1}. ${j.job_number.padEnd(20)} ${j.enq_number.padEnd(18)} ₹${j.quote_value}`)
  );
  return valid;
}

async function loginToERP(page) {
  console.log(`\n🔐 Logging into ERP: ${ERP_SITE}`);
  await page.goto(ERP_SITE);
  await page.fill('#tcusr', ERP_USERNAME);
  await page.fill('#tcpwd', ERP_PASSWORD);
  await page.click("input[name='login']");
  await page.waitForSelector('#r10c1', { timeout: 60000 });
  console.log('   ✅ Login successful');
}

async function navigateToEnquiryModule(page) {
  console.log('\n📂 Navigating: r10c1 → r4c2 → r4c3');
  await page.click('//*[@id="r10c1"]');
  await page.waitForTimeout(700);
  await page.click('//*[@id="r4c2"]');
  await page.waitForTimeout(700);
  await page.click('//*[@id="r4c3"]');
  await page.waitForSelector('#tcdiv1search', { timeout: 30000 });
  console.log('   ✅ Enquiry query page ready');
}

async function scrapeOneEnquiry(page, enqNumber) {
  const parsed = parseEnqNumber(enqNumber);
  if (!parsed) return null;

  const { searchId } = parsed;
  process.stdout.write(`   🔍 Searching "${searchId}" (${enqNumber}) ... `);

  await page.fill('#tcdiv1search', '');
  await page.fill('#tcdiv1search', searchId);
  await page.click('//*[@id="div1imgsearch"]');
  await page.waitForTimeout(2000);

  const rowXPath = `//td[normalize-space(text())='${enqNumber}']/parent::tr`;
  try {
    await page.waitForSelector(`xpath=${rowXPath}`, { timeout: 8000 });
  } catch {
    console.log('ROW NOT FOUND');
    return null;
  }

  await page.click(`xpath=${rowXPath}`);
  await page.waitForSelector('#tab3', { timeout: 15000 });
  await page.click('#tab3');
  await page.waitForTimeout(1000);

  let rawValue = null;
  try {
    await page.waitForSelector('#tcrqval', { timeout: 8000 });
    rawValue = await page.inputValue('#tcrqval').catch(
      () => page.$eval('#tcrqval', el => el.textContent?.trim() || el.value || '')
    );
  } catch {
    console.log('tcrqval NOT FOUND');
    return null;
  }

  const scraped = parseAmount(rawValue);
  process.stdout.write(`raw="${rawValue}" → ${scraped}\n`);

  // Go back via List button (tab1)
  try {
    await page.waitForSelector('#tab1', { timeout: 5000 });
    await page.click('#tab1');
    await page.waitForSelector('#tcdiv1search', { timeout: 15000 });
  } catch {
    await page.goBack().catch(() => {});
    await page.waitForSelector('#tcdiv1search', { timeout: 15000 }).catch(() => {});
  }

  return scraped;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   VERIFICATION: ERP scraper vs Supabase stored values    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (!ERP_SITE || !ERP_USERNAME || !ERP_PASSWORD) {
    console.error('❌ Missing ERP env vars'); process.exit(1);
  }

  const jobs = await fetchJobsWithKnownValues();
  if (jobs.length === 0) { console.log('\n⚠️  No test jobs found.'); process.exit(1); }

  const browser = await chromium.launch({ headless: true, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  page.on('dialog', async d => { await d.accept(); });

  const results = [];

  try {
    await loginToERP(page);
    await navigateToEnquiryModule(page);

    console.log('\n── Scraping ERP values ───────────────────────────────────');
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      process.stdout.write(`\n[${i + 1}/${jobs.length}] ${job.job_number} | Stored: ₹${job.quote_value}\n`);

      let scraped = null;
      try {
        scraped = await scrapeOneEnquiry(page, job.enq_number);
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }

      let status = '❓ NO DATA';
      if (scraped !== null && job.quote_value !== null) {
        const diff = Math.abs(scraped - job.quote_value);
        status = diff <= 0.01 ? '✅ MATCH' : `❌ MISMATCH  (diff: ${diff.toFixed(2)})`;
      }

      results.push({ job_number: job.job_number, enq_number: job.enq_number, stored: job.quote_value, scraped, status });
      await page.waitForTimeout(300);
    }
  } finally {
    await browser.close();
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL RESULTS                                                                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`${'Job Number'.padEnd(22)} ${'Enq Number'.padEnd(20)} ${'Stored (₹)'.padEnd(16)} ${'Scraped (₹)'.padEnd(16)} Result`);
  console.log('─'.repeat(95));
  results.forEach(r =>
    console.log(
      `${r.job_number.padEnd(22)} ${r.enq_number.padEnd(20)} ` +
      `${String(r.stored ?? '-').padEnd(16)} ${String(r.scraped ?? '-').padEnd(16)} ${r.status}`
    )
  );

  const matched    = results.filter(r => r.status.startsWith('✅')).length;
  const mismatched = results.filter(r => r.status.startsWith('❌')).length;
  const noData     = results.filter(r => r.status.startsWith('❓')).length;

  console.log('─'.repeat(95));
  console.log(`\n   ✅ Matched: ${matched}  |  ❌ Mismatched: ${mismatched}  |  ❓ No data: ${noData} / ${results.length} total`);

  if (matched === results.length) {
    console.log('\n🎉 ALL VALUES MATCH — scraper verified! Safe to replace update_erp_values.js');
  } else if (mismatched > 0) {
    console.log('\n⚠️  Mismatches found — review before using on null jobs.');
  } else {
    console.log('\n⚠️  Some rows not found in ERP — check XPath or session state.');
  }

  process.exit(mismatched > 0 ? 1 : 0);
}

main();
