'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PermissionsPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home/users');
  }, [router]);

  return null;
}
