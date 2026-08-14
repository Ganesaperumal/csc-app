'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SpocRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home/spocs');
  }, [router]);

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Redirecting to SPOCs Hub...
    </div>
  );
}
