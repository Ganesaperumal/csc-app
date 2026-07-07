import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    let allJobs: any[] = [];
    let from = 0;
    const step = 1000;
    
    // Loop to bypass the 1000-row PostgREST limit and fetch everything
    while (true) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('erp_job_id', { ascending: false, nullsFirst: false })
        .range(from, from + step - 1);
        
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allJobs = allJobs.concat(data);
      if (data.length < step) break; // Reached the end
      from += step;
    }

    if (allJobs.length === 0) {
      return new NextResponse("No data found", { status: 404 });
    }

    // Extract all column headers dynamically from the first row
    const headers = Object.keys(allJobs[0]);
    const csvRows = [];
    
    // Push the header row
    csvRows.push(headers.join(','));
    
    // Push each data row, handling commas, quotes, and newlines correctly
    for (const row of allJobs) {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    
    const headersRes = new Headers();
    headersRes.set('Content-Type', 'text/csv; charset=utf-8');
    headersRes.set('Content-Disposition', 'attachment; filename="All_Jobs_Export.csv"');

    return new NextResponse(csvString, {
      status: 200,
      headers: headersRes
    });

  } catch (error: any) {
    console.error('CSV Export Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
