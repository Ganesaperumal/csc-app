import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Ping GitHub Actions to trigger the workflow
    const GITHUB_PAT = process.env.GITHUB_PAT;
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Ganesaperumal';
    const GITHUB_REPO = process.env.GITHUB_REPO || 'csc-app';
    const GITHUB_WORKFLOW_ID = 'sync-erp-enq.yml';

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
      return NextResponse.json({ error: `GitHub API Error: ${ghResponse.status} - ${errText}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'GitHub Action Triggered Successfully' });
  } catch (error) {
    console.error('Manual Trigger ENQ API Error:', error);
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 });
  }
}
