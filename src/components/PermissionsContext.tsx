'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type AccessLevel = 'None' | 'View' | 'Read' | 'Edit';

type Permission = {
  category: string;
  role: string;
  section: string;
  access: AccessLevel;
};

type PermissionsContextType = {
  permissions: Permission[];
  loading: boolean;
  getAccessLevel: (pageName: string, userRoles: { role?: string; csc_role?: string; tracking_role?: string; unbilled_role?: string }) => AccessLevel;
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
        setPermissions(data as Permission[]);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, []);

  const getAccessLevel = (
    pageName: string, 
    userRoles: { role?: string; csc_role?: string; tracking_role?: string; unbilled_role?: string }
  ): AccessLevel => {
    if (!userRoles) return 'None';
    
    // No hardcoded admin bypass - let the database dictate access
    // if (userRoles.role === 'Admin' || userRoles.csc_role === 'Admin') return 'Edit';

    // Find all matching permissions for this user's roles
    const activeRoles = [userRoles.role, userRoles.csc_role, userRoles.tracking_role, userRoles.unbilled_role].filter(Boolean);
    
    let maxAccess: AccessLevel = 'None';

    permissions.forEach(perm => {
      if (perm.section === pageName && activeRoles.includes(perm.role)) {
        if (perm.access === 'Edit') {
          maxAccess = 'Edit';
        } else if (perm.access === 'Read' && (maxAccess === 'None' || maxAccess === 'View')) {
          maxAccess = 'Read';
        } else if (perm.access === 'View' && maxAccess === 'None') {
          maxAccess = 'View';
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
