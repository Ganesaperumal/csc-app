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
    const { 
      userId, name, username, email, phone, role, department, designation, 
      csc_access, csc_role, 
      followups_access, followups_role, tracking_role,
      all_jobs_access, all_jobs_role, 
      unbilled_access, unbilled_role, 
      spoc_access,
      branches, is_approved, photo, password 
    } = body;

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
    if (role !== undefined) updates.role = role;
    if (department !== undefined) updates.department = department;
    else if (designation !== undefined) updates.department = designation;

    const cscVal = csc_access !== undefined ? csc_access : csc_role;
    if (cscVal !== undefined) {
      updates.csc_access = cscVal;
      updates.csc_role = cscVal;
    }

    const followupsVal = followups_access !== undefined ? followups_access : (followups_role !== undefined ? followups_role : tracking_role);
    if (followupsVal !== undefined) {
      updates.followups_access = followupsVal;
      updates.followups_role = followupsVal;
    }

    const allJobsVal = all_jobs_access !== undefined ? all_jobs_access : all_jobs_role;
    if (allJobsVal !== undefined) {
      updates.all_jobs_access = allJobsVal;
      updates.all_jobs_role = allJobsVal;
    }

    const unbilledVal = unbilled_access !== undefined ? unbilled_access : unbilled_role;
    if (unbilledVal !== undefined) {
      updates.unbilled_access = unbilledVal;
      updates.unbilled_role = unbilledVal;
    }

    if (spoc_access !== undefined) {
      updates.spoc_access = spoc_access;
    }

    if (branches !== undefined) updates.branches = branches;
    if (is_approved !== undefined) updates.is_approved = is_approved;
    if (photo !== undefined) updates.photo = photo;

    // Resilient update loop: automatically strip any column that does not exist in Supabase schema cache
    let currentUpdates = { ...updates };
    let updateSuccess = false;
    let lastErrorMessage = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: err } = await supabase
        .from('profiles')
        .update(currentUpdates)
        .eq('id', userId);

      if (!err) {
        updateSuccess = true;
        break;
      }

      lastErrorMessage = err.message || JSON.stringify(err);
      console.warn(`[PUT /api/admin/users] Attempt ${attempt + 1} error:`, lastErrorMessage);

      // Check if error is due to a missing column in schema cache: "Could not find the '...' column of 'profiles' in the schema cache"
      const match = lastErrorMessage.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in currentUpdates) {
        const missingCol = match[1];
        delete currentUpdates[missingCol];
      } else {
        break;
      }
    }

    if (!updateSuccess) {
      return NextResponse.json({ error: lastErrorMessage }, { status: 400 });
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
