import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const { data, error } = await supabase.from('sync_lock').select('*').eq('id', 1).single();
    if (error || data?.is_syncing) {
      return NextResponse.json({ error: 'Sync already in progress.' }, { status: 400 });
    }

    // Ping GitHub Actions to trigger the workflow
    const GITHUB_PAT = process.env.GITHUB_PAT;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Ganesaperumal'; // Defaulting based on gh CLI
    const GITHUB_REPO = process.env.GITHUB_REPO || 'csc-app';
    const GITHUB_WORKFLOW_ID = 'sync-erp.yml';

    if (!GITHUB_PAT) {
      console.warn('GITHUB_PAT not set. We would normally trigger the GitHub Action here.');
      return NextResponse.json({ message: 'Sync Triggered (Mocked - Missing PAT)' });
    }

    const ghResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
      })
    });

    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      console.error('GitHub API Error:', errText);
      return NextResponse.json({ error: 'Failed to trigger GitHub Action' }, { status: 500 });
    }

    return NextResponse.json({ message: 'GitHub Action Triggered Successfully' });
  } catch (error) {
    console.error('Manual Trigger API Error:', error);
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 });
  }
}
