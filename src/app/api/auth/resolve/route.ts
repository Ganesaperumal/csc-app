import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { input } = await request.json();
    if (!input) return NextResponse.json({ error: 'Input required' }, { status: 400 });

    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('username, phone, id, name')
      .or(`username.ilike.${input},phone.ilike.${input},name.ilike.${input}`);

    if (!matchedProfiles || matchedProfiles.length === 0) {
      return NextResponse.json({ emails: [] });
    }

    const emails: string[] = [];
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authMap = new Map((authData?.users || []).map((u: any) => [u.id, u.email]));

    for (const p of matchedProfiles) {
      const actualEmail = authMap.get(p.id);
      if (actualEmail) {
        emails.push(actualEmail);
      } else if (p.username) {
        emails.push(`${p.username}@transworldintl.com`.toLowerCase());
      }
    }

    return NextResponse.json({ emails: Array.from(new Set(emails)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
