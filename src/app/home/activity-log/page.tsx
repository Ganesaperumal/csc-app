'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivityLogPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/home/reports?tab=activity_log');
  }, [router]);

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Redirecting to Reports &amp; Analytics...
    </div>
  );
}

