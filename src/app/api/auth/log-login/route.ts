import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function parseUserAgent(ua: string) {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop';

  if (!ua) return { browser, os, device };

  // Device detection
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  // OS detection
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser detection
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { browser, os, device };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, username, name, role, department, branch, status, errorMessage } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'Unknown');
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const { browser, os, device } = parseUserAgent(userAgent);

    const logPayload = {
      user_id: userId || null,
      username: username.toLowerCase().trim(),
      name: name || null,
      role: role || null,
      department: department || null,
      branch: branch || null,
      ip_address: clientIp,
      user_agent: userAgent,
      device,
      browser,
      os,
      status: status || 'success',
      error_message: errorMessage || null,
      created_at: new Date().toISOString(),
    };

    // Insert into login_logs table
    const { error: insertError } = await supabaseAdmin
      .from('login_logs')
      .insert([logPayload]);

    if (insertError) {
      console.warn('[log-login] Insert warning (table may not exist yet):', insertError.message);
    }

    // Update profile last_login_at if success
    if (userId && status === 'success') {
      try {
        await supabaseAdmin
          .from('profiles')
          .update({
            last_login_at: new Date().toISOString(),
            last_login_ip: clientIp,
          })
          .eq('id', userId);
      } catch (profErr) {
        // Silently skip if column hasn't been migrated yet
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/auth/log-login] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
