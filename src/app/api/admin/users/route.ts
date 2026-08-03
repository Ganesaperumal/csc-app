import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-only admin client — always uses service role key regardless of module cache.
// Do NOT use the shared @/lib/supabase singleton here: it can be evaluated in the
// client bundle context first (where SUPABASE_SERVICE_ROLE_KEY is undefined),
// causing auth.admin calls to silently run with the anon key.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all user profiles with auth emails
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, name, username, role, csc_role, tracking_role, unbilled_role, branch_user_role, branches, is_approved, photo, phone, chat_access');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch auth emails to enrich profiles
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authMap = new Map((authData?.users || []).map(u => [u.id, u.email]));

    const enrichedUsers = users.map(u => ({
      ...u,
      email: authMap.get(u.id) || (u.username ? `${u.username}@transworldintl.com` : '')
    }));

    return NextResponse.json({ users: enrichedUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update user profile, roles, approval status, or password
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, username, email, phone, role, csc_role, tracking_role, unbilled_role, branches, is_approved, photo, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Only update Supabase Auth if a new password is explicitly provided.
    //    Email is intentionally NOT updated here — it's always the formula email
    //    and `email` in the payload is always truthy (even when unchanged), which
    //    caused spurious auth.admin calls that fail with empty error messages.
    if (password) {
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (authError) {
        const msg = authError.message || JSON.stringify(authError);
        console.error('[PUT /api/admin/users] Auth update error:', msg);
        return NextResponse.json({ error: `Auth Error: ${msg}` }, { status: 400 });
      }
    }

    // 2. Update Profile fields
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (username !== undefined) updates.username = username;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (csc_role !== undefined) updates.csc_role = csc_role;
    if (tracking_role !== undefined) updates.tracking_role = tracking_role;
    if (unbilled_role !== undefined) updates.unbilled_role = unbilled_role;
    if (branches !== undefined) updates.branches = branches;
    if (is_approved !== undefined) updates.is_approved = is_approved;
    // Only update photo if it's changed (avoid sending unchanged large base64 strings)
    if (photo !== undefined) updates.photo = photo;

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) {
      console.error('[PUT /api/admin/users] Profile update error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove user account
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete profile first
    await supabase.from('profiles').delete().eq('id', userId);

    // Delete Auth User
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
