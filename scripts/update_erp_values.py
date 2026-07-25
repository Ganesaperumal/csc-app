import os
import asyncio
import pandas as pd
from supabase import create_client, Client
from playwright.async_api import async_playwright

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ERP_SITE = os.environ.get("ERP_SITE", "")
ERP_USERNAME = os.environ.get("ERP_USERNAME", "")
ERP_PASSWORD = os.environ.get("ERP_PASSWORD", "")

REPORT_FILE_PATH = "ti_enquiry_report.xls"

async def download_enquiry_report():
    print("Downloading Enquiry Report from ERP...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        await page.goto(ERP_SITE)
        await page.fill('#tcusr', ERP_USERNAME)
        await page.fill('#tcpwd', ERP_PASSWORD)
        async with page.expect_navigation():
            await page.click("input[name='login']")

        await page.wait_for_selector('#r4c1', state='visible')
        await page.click('#r4c1')
        await page.wait_for_timeout(500)
        await page.click('#r4c2')
        await page.wait_for_timeout(500)
        await page.click('#r3c4')

        await page.wait_for_selector('#tcfrmdt', state='visible')
        async with page.expect_download(timeout=120000) as download_info:
            await page.click('#btnexp')

        download = await download_info.value
        await download.save_as(REPORT_FILE_PATH)
        print("Download complete.")
        await browser.close()

def process_enquiry_values():
    print("Extracting Master Enquiry Number and Final Quote Values...")
    try:
        dfs = pd.read_html(REPORT_FILE_PATH, header=7)
        df = max(dfs, key=lambda x: x.shape[0])
    except ValueError:
        df = pd.read_csv(REPORT_FILE_PATH, sep='\t', header=7, on_bad_lines='skip')

    df.columns = df.columns.str.replace(r'\s+', ' ', regex=True).str.strip()
    df.dropna(how='all', axis=0, inplace=True)
    
    enq_values = {}
    for _, row in df.iterrows():
        enq_no = str(row.get('Master Enq No', '')).strip()
        val1 = row.get('Quote Value', 0)
        val2 = row.get('Final Quote Value', 0)
        
        try:
            val2_float = float(val2) if pd.notnull(val2) else 0
            val1_float = float(val1) if pd.notnull(val1) else 0
            final_val = val2_float if val2_float > 0 else val1_float
        except Exception:
            final_val = 0
            
        if enq_no and final_val > 0:
            enq_values[enq_no] = final_val
            
    return enq_values

def update_supabase_jobs(enq_values):
    print("Connecting to Supabase to update jobs with missing values...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    res = supabase.table('jobs').select('job_number, enq_number').or_('quote_value.is.null,quote_value.eq.0').execute()
    jobs = res.data
    
    if not jobs:
        print("No jobs found with missing values.")
        return
        
    print(f"Found {len(jobs)} jobs in Supabase needing value updates.")
    
    updates = 0
    for job in jobs:
        enq = job.get('enq_number')
        if not enq: continue
            
        matched_val = enq_values.get(enq)
        if not matched_val:
            for rep_enq, val in enq_values.items():
                if enq in rep_enq or rep_enq in enq:
                    matched_val = val
                    break
        
        if matched_val:
            supabase.table('jobs').update({'quote_value': matched_val}).eq('job_number', job['job_number']).execute()
            updates += 1
            
    print(f"Successfully updated {updates} jobs with enquiry values!")

async def main():
    await download_enquiry_report()
    enq_values = process_enquiry_values()
    print(f"Extracted {len(enq_values)} valid quote values from the report.")
    update_supabase_jobs(enq_values)

if __name__ == "__main__":
    asyncio.run(main())
