'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AccessLevel = 'None' | 'View' | 'Edit';

type Permission = {
  category: string;
  role: string;
  section: string;
  access: AccessLevel;
};

type UserRolesParam = { 
  role?: string; 
  csc_access?: string; csc_role?: string; 
  unbilled_access?: string; unbilled_role?: string;
  all_jobs_access?: string; all_jobs_role?: string;
  followups_access?: string; followups_role?: string;
};

type PermissionsContextType = {
  permissions: Permission[];
  loading: boolean;
  getAccessLevel: (pageName: string, userRoles: UserRolesParam) => AccessLevel;
};

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  loading: true,
  getAccessLevel: () => 'None',
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (!error && data) {
        const mappedData = data.map((p: any) => ({
          ...p,
          access: p.access === 'Read' ? 'View' : p.access
        }));
        setPermissions(mappedData as Permission[]);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, []);

  const getAccessLevel = (
    pageName: string, 
    userRoles: UserRolesParam
  ): AccessLevel => {
    if (!userRoles) return 'None';

    let maxAccess: AccessLevel = 'None';
    const isCSCGroup = pageName === 'Active Jobs' || pageName === 'Closed Jobs' || pageName === 'CSC Jobs';

    const userCsc = userRoles.csc_access || userRoles.csc_role;
    const userUnbilled = userRoles.unbilled_access || userRoles.unbilled_role;

    permissions.forEach(perm => {
      let isMatch = perm.section === pageName;
      if (isCSCGroup) {
        const hasCSCJobsRow = permissions.some(p => p.section === 'CSC Jobs' && p.role === (perm.category === 'CSC' ? (userCsc || userRoles.role) : userRoles.role));
        if (hasCSCJobsRow) {
          isMatch = perm.section === 'CSC Jobs';
        } else {
          isMatch = perm.section === 'CSC Jobs' || perm.section === pageName;
        }
      }

      if (isMatch) {
        if (pageName === 'Activity Log' && perm.category === 'Unbilled') return;

        let applicableRole = userRoles.role;
        
        if (perm.category === 'CSC') {
          applicableRole = userCsc ? userCsc : applicableRole;
        } else if (perm.category === 'Unbilled') {
          applicableRole = userUnbilled ? userUnbilled : applicableRole;
        }

        if (applicableRole === perm.role && applicableRole !== 'None') {
          const rawAccess = perm.access as string;
          maxAccess = (rawAccess === 'Read' ? 'View' : perm.access) as AccessLevel || 'None';
        }
      }
    });

    return maxAccess;
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, getAccessLevel }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
