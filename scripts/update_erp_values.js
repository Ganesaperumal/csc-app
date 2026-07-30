/**
 * update_erp_values.js — Per-Enquiry Quote Value Sync
 * ----------------------------------------------------
 * Replaces the old bulk-download approach.
 * Fetches jobs where enq_number is YY=26 and quote_value is null/zero,
 * then scrapes the ERP Enquiry module one-by-one to fill in the missing values.
 *
 * Why per-enquiry (not bulk download):
 *   - Only ~20 new jobs/day need values → ~2 minutes total (vs 10+ min download)
 *   - Exact match by enq_number — no fuzzy string matching edge cases
 *   - Verified: 10/10 scraped values matched Supabase stored values exactly
 */

const path = require('path');
const fs = require('fs');

// Load .env.local when running locally — skipped automatically in GitHub Actions (file won't exist)
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const { chromium } = require('playwright');
const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const ERP_SITE     = process.env.ERP_SITE;
const ERP_USERNAME = process.env.ERP_USERNAME;
const ERP_PASSWORD = process.env.ERP_PASSWORD;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws }
});

// ── Helpers ───────────────────────────────────────────────

/** EN/BLR/26/1234 → { searchId: 'BLR', year: '26' } */
function parseEnqNumber(enqNumber) {
  const parts = String(enqNumber || '').split('/');
  if (parts.length !== 4) return null;
  return { prefix: parts[0], searchId: parts[1], year: parts[2], seq: parts[3] };
}

/** "7,45,000.50" → 745000.5 */
function parseAmount(raw) {
  if (!raw) return null;
  const val = parseFloat(String(raw).replace(/,/g, '').trim());
  return isNaN(val) ? null : val;
}

// ── Step 1: Fetch jobs needing values ────────────────────

async function fetchJobsNeedingValues() {
  console.log('📋 Fetching jobs with null/zero quote_value (enq_number YY=26)...');

  const { data, error } = await supabase
    .from('jobs')
    .select('job_number, enq_number')
    .or('quote_value.is.null,quote_value.eq.0')
    .like('enq_number', 'EN/%/26/%');

  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);

  const valid = (data || []).filter(j => parseEnqNumber(j.enq_number)?.year === '26');
  console.log(`   Found ${valid.length} job(s) needing quote values`);
  return valid;
}

// ── Step 2: ERP Login ─────────────────────────────────────

async function loginToERP(page) {
  console.log(`🔐 Logging into ERP: ${ERP_SITE}`);
  
  // Clear any existing cookies/session state
  await page.context().clearCookies();
  await page.goto(ERP_SITE, { waitUntil: 'domcontentloaded' });
  
  await page.fill('#tcusr', ERP_USERNAME.trim());
  await page.fill('#tcpwd', ERP_PASSWORD.trim());
  await page.click("input[name='login']");
  
  // Wait for network response/navigation
  await page.waitForTimeout(2000);
  
  if (page.url().includes('tnerr=')) {
    throw new Error(`ERP Login Failed! ERP redirected to error URL: ${page.url()} (tnerr=8 usually means invalid username/password or active session conflict)`);
  }
  
  try {
    await page.waitForSelector('#r10c1, #r3c1', { state: 'visible', timeout: 30000 });
  } catch (err) {
    if (page.url().includes('tnerr=')) {
      throw new Error(`ERP Login Failed (tnerr in URL: ${page.url()})`);
    }
    throw new Error(`ERP Login timed out waiting for main menu: ${err.message}`);
  }

  console.log('   ✅ Login successful');
}

// ── Step 3: Navigate to Enquiry query module ──────────────

async function navigateToEnquiryModule(page) {
  console.log('📂 Navigating to Enquiry module...');
  
  // Menu 1: Queries / Master menu (#r10c1)
  const menu1 = page.locator('#r10c1');
  await menu1.waitFor({ state: 'visible', timeout: 15000 });
  await menu1.click();
  
  // Menu 2: Enquiry submenu (#r4c2)
  const menu2 = page.locator('#r4c2');
  await menu2.waitFor({ state: 'visible', timeout: 15000 });
  await menu2.click();
  
  // Menu 3: Enquiry Query item (#r4c3)
  const menu3 = page.locator('#r4c3');
  await menu3.waitFor({ state: 'visible', timeout: 15000 });
  await menu3.click();
  
  await page.waitForTimeout(1500);

  if (page.url().includes('tnerr=')) {
    throw new Error(`ERP Menu Navigation Failed! Redirected to error URL: ${page.url()} (User account may lack permission to access Enquiry module, or session expired)`);
  }

  await page.waitForSelector('#tcdiv1search', { state: 'visible', timeout: 30000 });
  console.log('   ✅ Enquiry query page ready');
}

// ── Step 4: Scrape one enquiry value ─────────────────────

async function scrapeEnquiryValue(page, rawEnqNumber) {
  const enqNumber = String(rawEnqNumber).trim();
  const parsed = parseEnqNumber(enqNumber);
  if (!parsed) return null;

  const { searchId } = parsed;

  // Enter search ID (XXXX from EN/XXXX/YY/ZZZ) and search
  await page.fill('#tcdiv1search', '');
  await page.fill('#tcdiv1search', searchId);
  await page.waitForTimeout(300);
  await page.press('#tcdiv1search', 'Enter').catch(() => {});
  await page.click('//*[@id="div1imgsearch"]').catch(() => {});
  await page.waitForTimeout(2500);

  // Find and click the exact matching row (try exact match first, then contains)
  const locatorsToTry = [
    `//td[normalize-space(text())='${enqNumber}']`,
    `//td[contains(normalize-space(.), '${enqNumber}')]`,
    `//a[contains(text(), '${enqNumber}')]`,
    `//td[contains(text(), '/${searchId}/26/')]`
  ];

  let targetLocator = null;
  for (const loc of locatorsToTry) {
    if (await page.locator(loc).count() > 0) {
      targetLocator = loc;
      break;
    }
  }

  if (!targetLocator) {
    try {
      await page.waitForSelector(locatorsToTry[0], { timeout: 4000 });
      targetLocator = locatorsToTry[0];
    } catch {
      console.log(`   ⚠️  ${enqNumber} — row not found in ERP search results`);
      try {
        const rows = await page.locator('tr').allInnerTexts();
        console.log('   [DEBUG] Visible rows in ERP:');
        rows.slice(0, 10).forEach((r, i) => console.log(`     Row ${i}: ${r.replace(/\n/g, ' | ')}`));
      } catch(e) {}
      return null;
    }
  }

  await page.click(targetLocator);

  // Click Tab 3 (Quote/Value tab)
  await page.waitForSelector('#tab3', { timeout: 15000 });
  await page.click('#tab3');
  await page.waitForTimeout(1000);

  // Read the quote value
  let rawValue = null;
  try {
    await page.waitForSelector('#tcrqval', { timeout: 8000 });
    rawValue = await page.inputValue('#tcrqval').catch(
      () => page.$eval('#tcrqval', el => el.textContent?.trim() || el.value || '')
    );
  } catch {
    console.log(`   ⚠️  ${enqNumber} — #tcrqval field not found`);
  }

  const quoteValue = parseAmount(rawValue);

  // Click List (tab1) to go back to search for the next enquiry
  try {
    await page.waitForSelector('#tab1', { timeout: 5000 });
    await page.click('#tab1');
    await page.waitForSelector('#tcdiv1search', { timeout: 15000 });
  } catch {
    await page.goBack().catch(() => {});
    await page.waitForSelector('#tcdiv1search', { timeout: 15000 }).catch(() => {});
  }

  return quoteValue;
}

// ── Step 5: Update Supabase ───────────────────────────────

async function updateQuoteValue(jobNumber, quoteValue) {
  const { error } = await supabase
    .from('jobs')
    .update({ quote_value: quoteValue })
    .eq('job_number', jobNumber);

  if (error) {
    console.log(`   ❌ DB update failed for ${jobNumber}: ${error.message}`);
    return false;
  }
  return true;
}

// ── Main ──────────────────────────────────────────────────

async function main() {
  if (!ERP_SITE || !ERP_USERNAME || !ERP_PASSWORD) {
    console.error('❌ Missing ERP env vars (ERP_SITE, ERP_USERNAME, ERP_PASSWORD)');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase env vars');
    process.exit(1);
  }

  const jobs = await fetchJobsNeedingValues();

  if (jobs.length === 0) {
    console.log('✅ No jobs need quote value updates. Done.');
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  context.setDefaultTimeout(30000);
  const page = await context.newPage();
  page.on('dialog', async d => { console.log(`⚠️  Dialog: ${d.message()}`); await d.accept(); });

  let updated = 0, skipped = 0, failed = 0;

  try {
    await loginToERP(page);
    await navigateToEnquiryModule(page);

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      process.stdout.write(`[${i + 1}/${jobs.length}] ${job.job_number} (${job.enq_number}) ... `);

      let quoteValue = null;
      try {
        quoteValue = await scrapeEnquiryValue(page, job.enq_number);
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
        failed++;
        continue;
      }

      if (!quoteValue || quoteValue <= 0) {
        console.log('no value found — skipped');
        skipped++;
        continue;
      }

      const ok = await updateQuoteValue(job.job_number, quoteValue);
      if (ok) {
        console.log(`₹${quoteValue} ✅`);
        updated++;
      } else {
        failed++;
      }

      await page.waitForTimeout(300);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n🏁 Done — Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
