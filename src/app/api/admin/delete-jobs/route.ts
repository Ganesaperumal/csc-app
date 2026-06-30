import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Using neq on something that doesn't exist to delete all rows since Supabase requires a filter
    const { error } = await supabaseAdmin.from('jobs').delete().neq('job_number', 'IMPOSSIBLE_VALUE');
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, message: 'All jobs deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
