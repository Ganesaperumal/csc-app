import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Must use service role key to use admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // automatically confirms the email so they can log in instantly
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Insert into profiles table
    const username = email.split('@')[0];
    const { error: profileError } = await supabaseAdmin.from('profiles').insert([
      { 
        id: data.user.id, 
        username: username, 
        name: name || username, 
        role: 'Executive', 
        chat_access: true 
      }
    ]);

    if (profileError) {
      // In a real app we might want to rollback the user creation here, but we will return the error for now
      return NextResponse.json({ error: 'User created but profile failed: ' + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
