/**
 * Auth & Permission Utility Helpers
 */

export function isSuperAdmin(profile: any): boolean {
  if (!profile) return false;
  return Boolean(profile.is_super_admin === true);
}
