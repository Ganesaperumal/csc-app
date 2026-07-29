'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/components/PermissionsContext';

type AccessLevel = 'None' | 'View' | 'Edit';

/**
 * Hook that checks the permission matrix for one or more page names and:
 *   - Redirects to /home if access is 'None'
 *   - Returns the resolved access level and whether editing is allowed
 *
 * Usage:
 *   const { access, canEdit, profile } = usePageAccess('Active Jobs');
 *   const { access, canEdit } = usePageAccess(['Active Jobs', 'All Jobs']);  // OR logic: highest wins
 */
export function usePageAccess(pageNames: string | string[]) {
  const router = useRouter();
  const { getAccessLevel, loading: permLoading } = usePermissions();
  const [profile, setProfile] = useState<any>(null);
  const [access, setAccess] = useState<AccessLevel | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profileData) {
        router.push('/login');
        return;
      }

      setProfile(profileData);

      if (permLoading) return; // wait for permissions to load

      const names = Array.isArray(pageNames) ? pageNames : [pageNames];

      // Determine highest access level across all requested page names
      let resolved: AccessLevel = 'None';
      for (const name of names) {
        const lvl = getAccessLevel(name, profileData) as AccessLevel;
        if (lvl === 'Edit') { resolved = 'Edit'; break; }
        if (lvl === 'View') resolved = 'View';
      }

      if (resolved === 'None') {
        router.push('/home');
        return;
      }

      setAccess(resolved);
      setChecked(true);
    };

    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permLoading]);

  return {
    access,
    canEdit: access === 'Edit',
    canView: access === 'View' || access === 'Edit',
    profile,
    ready: checked && !permLoading,
  };
}
