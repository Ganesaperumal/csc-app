require('dotenv').config({ path: '.env.local' });

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/role_permissions?on_conflict=category,role,section';

const permissions = [
    {category: 'CSC', role: 'Admin', section: 'Active Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Admin', section: 'Closed Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Admin', section: 'All Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Admin', section: 'Follow-ups', access: 'Edit'},
    {category: 'CSC', role: 'Admin', section: 'Reports', access: 'Edit'},
    {category: 'CSC', role: 'Admin', section: 'Group Chat', access: 'Edit'},
    {category: 'CSC', role: 'Admin', section: 'Sync ERP', access: 'Edit'},
    
    {category: 'Unbilled', role: 'Admin', section: 'Unbilled', access: 'Edit'},
    
    {category: 'Admin', role: 'Admin', section: 'User Management', access: 'Edit'},
    {category: 'Admin', role: 'Admin', section: 'Role Permissions', access: 'Edit'},
    {category: 'Admin', role: 'Admin', section: 'Admin Center', access: 'Edit'},

    {category: 'CSC', role: 'Manager', section: 'Active Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Manager', section: 'Closed Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Manager', section: 'All Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Manager', section: 'Follow-ups', access: 'Edit'},
    {category: 'CSC', role: 'Manager', section: 'Group Chat', access: 'Edit'},
    {category: 'Unbilled', role: 'Manager', section: 'Unbilled', access: 'Edit'},

    {category: 'CSC', role: 'Executive', section: 'Active Jobs', access: 'Edit'},
    {category: 'CSC', role: 'Executive', section: 'Closed Jobs', access: 'View'},
    {category: 'CSC', role: 'Executive', section: 'All Jobs', access: 'View'},
    {category: 'CSC', role: 'Executive', section: 'Follow-ups', access: 'Edit'},
    {category: 'CSC', role: 'Executive', section: 'Group Chat', access: 'Edit'},
    {category: 'Unbilled', role: 'Executive', section: 'Unbilled', access: 'Edit'},

    {category: 'CSC', role: 'Viewer', section: 'Active Jobs', access: 'View'},
    {category: 'CSC', role: 'Viewer', section: 'Closed Jobs', access: 'View'},
    {category: 'CSC', role: 'Viewer', section: 'All Jobs', access: 'View'},
    {category: 'CSC', role: 'Viewer', section: 'Group Chat', access: 'View'},
    {category: 'Unbilled', role: 'Viewer', section: 'Unbilled', access: 'View'}
];

async function restore() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(permissions)
  });
  if (!res.ok) {
     console.log(await res.text());
  } else {
     console.log('Success restored all permissions!');
  }
}
restore();
