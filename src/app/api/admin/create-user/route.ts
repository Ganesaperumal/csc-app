import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, name, username: reqUsername, role, csc_role, tracking_role, followups_role, all_jobs_role, unbilled_role, branches, phone, photo, is_approved } = await request.json();

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

    let insertPayload: any = {
      id: userId,
      name: name || username,
      username,
      csc_role: csc_role || 'None',
      unbilled_role: unbilled_role || 'None',
      branches: branches || [],
      phone: phone || null,
      photo: photo || null,
      is_approved: is_approved !== undefined ? is_approved : true,
    };

    if (followups_role !== undefined) insertPayload.followups_role = followups_role;
    if (tracking_role !== undefined) insertPayload.tracking_role = tracking_role;
    if (all_jobs_role !== undefined) insertPayload.all_jobs_role = all_jobs_role;
    if (role !== undefined) insertPayload.role = role;

    // Resilient insert loop: automatically strip any column that does not exist in Supabase schema cache
    let insertSuccess = false;
    let lastErrorMessage = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error: err } = await supabase
        .from('profiles')
        .insert([insertPayload]);

      if (!err) {
        insertSuccess = true;
        break;
      }

      lastErrorMessage = err.message || JSON.stringify(err);
      console.warn(`[POST /api/admin/create-user] Attempt ${attempt + 1} error:`, lastErrorMessage);

      const match = lastErrorMessage.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in insertPayload) {
        const missingCol = match[1];
        delete insertPayload[missingCol];
      } else {
        break;
      }
    }

    if (!insertSuccess) {
      return NextResponse.json({ error: lastErrorMessage }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
