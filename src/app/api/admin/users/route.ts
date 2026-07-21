import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export async function GET(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profiles, error } = await supabaseAdmin.from('profiles').select('*');
    
    if (error) throw error;
    
    return NextResponse.json({ users: profiles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, role, chat_enabled, password } = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    
    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role, chat_access: chat_enabled })
      .eq('id', userId);
      
    if (profileError) throw profileError;
    
    // Update password if provided
    if (password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      });
      if (authError) throw authError;
    }
    
    // Also keep user_metadata in sync for backward compatibility just in case
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role, chat_enabled }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Delete profile first
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
      
    if (profileError) throw profileError;

    // Delete user from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
