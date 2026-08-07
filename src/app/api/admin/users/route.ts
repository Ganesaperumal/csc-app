import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-only admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET all user profiles with auth emails
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('[GET /api/admin/users] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let authMap = new Map();
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) {
        authMap = new Map(authData.users.map(u => [u.id, u.email]));
      }
    } catch (authErr) {
      console.error('[GET /api/admin/users] Auth listUsers error:', authErr);
    }

    const enrichedUsers = (users || []).map(u => ({
      ...u,
      email: authMap.get(u.id) || (u.username ? `${u.username}@transworldintl.com` : '')
    }));

    return NextResponse.json({ users: enrichedUsers });
  } catch (error: any) {
    console.error('[GET /api/admin/users] Server error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update user profile, roles, approval status, or password
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, username, email, phone, role, csc_role, tracking_role, followups_role, all_jobs_role, unbilled_role, branches, is_approved, photo, password } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (password) {
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, { password });
      if (authError) {
        const msg = authError.message || JSON.stringify(authError);
        console.error('[PUT /api/admin/users] Auth update error:', msg);
        return NextResponse.json({ error: `Auth Error: ${msg}` }, { status: 400 });
      }
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (username !== undefined) updates.username = username;
    if (phone !== undefined) updates.phone = phone;
    if (csc_role !== undefined) updates.csc_role = csc_role;
    if (unbilled_role !== undefined) updates.unbilled_role = unbilled_role;
    
    // Save both direct columns and legacy fallback columns for full safety
    if (followups_role !== undefined) {
      updates.followups_role = followups_role;
      updates.tracking_role = followups_role === 'All' ? 'Admin' : (followups_role === 'Self' ? 'Executive' : 'None');
    } else if (tracking_role !== undefined) {
      updates.tracking_role = tracking_role;
      updates.followups_role = tracking_role === 'Admin' ? 'All' : (tracking_role === 'Executive' || tracking_role === 'Self' ? 'Self' : 'None');
    }
    
    if (all_jobs_role !== undefined) {
      updates.all_jobs_role = all_jobs_role;
      updates.role = all_jobs_role === 'View' ? 'Viewer' : 'None';
    } else if (role !== undefined) {
      updates.role = role;
      updates.all_jobs_role = (role === 'None' || !role) ? 'None' : 'View';
    }
    
    if (branches !== undefined) updates.branches = branches;
    if (is_approved !== undefined) updates.is_approved = is_approved;
    if (photo !== undefined) updates.photo = photo;

    const { error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) {
      console.error('[PUT /api/admin/users] Profile update error:', profileError);
      // Fallback: if new columns don't exist in DB schema yet, remove them and retry with legacy columns
      delete updates.followups_role;
      delete updates.all_jobs_role;
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 400 });
      }
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

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
    }

    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      return NextResponse.json({ error: deleteProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
