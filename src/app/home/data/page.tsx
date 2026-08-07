'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MissingDataRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home/admin');
  }, [router]);

  return null;
}
