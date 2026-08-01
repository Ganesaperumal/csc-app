'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivityLogPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/home/reports');
  }, [router]);

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Redirecting to Reports &amp; Analytics...
    </div>
  );
}

