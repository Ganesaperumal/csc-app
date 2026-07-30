import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email, password, name, username: reqUsername, role, csc_role, tracking_role, unbilled_role, branches, phone, photo, is_approved } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const username = reqUsername ? reqUsername.toLowerCase() : email.split('@')[0].toLowerCase();

    // 1. Create Auth User in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, username }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert Profile into public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          name: name || username,
          username,
          role: role || (unbilled_role === 'Branch Manager' ? 'Branch Manager' : 'Executive'),
          csc_role: csc_role || 'None',
          tracking_role: tracking_role || 'None',
          unbilled_role: unbilled_role || 'None',
          branch_user_role: (unbilled_role === 'Branch Manager') ? unbilled_role : null,
          branches: branches || [],
          phone: phone || null,
          photo: photo || null,
          is_approved: is_approved !== undefined ? is_approved : true,
          chat_access: true
        }
      ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
