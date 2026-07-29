import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use SERVICE ROLE KEY to bypass RLS — admin-only endpoint
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Columns to include in the export — explicitly exclude id, created_at, updated_at, display_id
const EXPORT_COLUMNS = [
  'job_number',
  'enquiry_number',
  'branch',
  'customer_name',
  'company',
  'job_date',
  'packing_date',
  'delivery_date',
  'goods_track_status',
  'po_status',
  'po_date',
  'inv_request_date',
  'bill_closure_date',
  'sales_by',
  'spoc_name',
  'quote_value',
  'invoice_number',
  'invoice_date',
] as const;

export async function GET() {
  try {
    let allRows: any[] = [];
    let from = 0;
    const step = 1000;

    // Paginate to bypass the 1000-row PostgREST limit
    while (true) {
      const { data, error } = await supabase
        .from('legacy_jobs')
        .select(EXPORT_COLUMNS.join(', '))
        .order('job_number', { ascending: true })
        .range(from, from + step - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows = allRows.concat(data);
      if (data.length < step) break;
      from += step;
    }

    // Build CSV manually for full control over escaping
    const headers = [...EXPORT_COLUMNS];

    const escape = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const row of allRows) {
      csvRows.push(headers.map(h => escape(row[h])).join(','));
    }

    const csvString = csvRows.join('\n');
    const today = new Date().toISOString().split('T')[0];

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    resHeaders.set('Content-Disposition', `attachment; filename="legacy_jobs_export_${today}.csv"`);

    return new NextResponse(csvString, { status: 200, headers: resHeaders });
  } catch (error: any) {
    console.error('Legacy Jobs CSV Export Error:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
