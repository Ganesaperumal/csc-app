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

type PermissionsContextType = {
  permissions: Permission[];
  loading: boolean;
  getAccessLevel: (pageName: string, userRoles: { role?: string; csc_role?: string; unbilled_role?: string }) => AccessLevel;
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
    userRoles: { role?: string; csc_role?: string; unbilled_role?: string }
  ): AccessLevel => {
    if (!userRoles) return 'None';

    let maxAccess: AccessLevel = 'None';
    const isCSCGroup = pageName === 'Active Jobs' || pageName === 'Closed Jobs' || pageName === 'CSC Jobs';

    permissions.forEach(perm => {
      let isMatch = perm.section === pageName;
      if (isCSCGroup) {
        // If a CSC Jobs entry exists, prefer CSC Jobs over legacy Active/Closed entries
        const hasCSCJobsRow = permissions.some(p => p.section === 'CSC Jobs' && p.role === (perm.category === 'CSC' ? (userRoles.csc_role || userRoles.role) : userRoles.role));
        if (hasCSCJobsRow) {
          isMatch = perm.section === 'CSC Jobs';
        } else {
          isMatch = perm.section === 'CSC Jobs' || perm.section === pageName;
        }
      }

      if (isMatch) {
        // Prevent orphaned Unbilled category permissions from overriding Activity Log
        if (pageName === 'Activity Log' && perm.category === 'Unbilled') return;

        // Determine the applicable role for this permission's category
        let applicableRole = userRoles.role; // Default/legacy role
        
        if (perm.category === 'CSC') {
          applicableRole = userRoles.csc_role ? userRoles.csc_role : applicableRole;
        } else if (perm.category === 'Unbilled') {
          applicableRole = userRoles.unbilled_role ? userRoles.unbilled_role : applicableRole;
        }

        // Only grant access if the applicable role matches the permission's role
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
