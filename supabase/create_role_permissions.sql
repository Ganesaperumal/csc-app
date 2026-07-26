-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,       -- 'CSC', 'Tracking', 'Unbilled', 'Admin'
    role_name TEXT NOT NULL,      -- 'Viewer', 'Executive', 'Manager', 'Admin', 'SPOC'
    page_name TEXT NOT NULL,      -- 'Active Jobs', 'Closed Jobs', 'Unbilled Management', etc.
    access_level TEXT NOT NULL DEFAULT 'None',   -- 'None', 'View', 'Edit'
    UNIQUE(category, role_name, page_name)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read permissions
CREATE POLICY "Allow authenticated read" ON public.role_permissions FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to insert/update permissions
CREATE POLICY "Allow admins to update" ON public.role_permissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
  )
);

-- Seed Initial Default Permissions for Admin (Access to everything)
INSERT INTO public.role_permissions (category, role_name, page_name, access_level) VALUES
('CSC', 'Admin', 'Active Jobs', 'Edit'),
('CSC', 'Admin', 'Closed Jobs', 'Edit'),
('CSC', 'Admin', 'All Jobs', 'Edit'),
('CSC', 'Admin', 'Follow-ups', 'Edit'),
('CSC', 'Admin', 'SPOC Management', 'Edit'),
('CSC', 'Admin', 'Reports & Analytics', 'Edit'),
('Tracking', 'Admin', 'Tracking Dashboard', 'Edit'),
('Tracking', 'Admin', 'Group Chat', 'Edit'),
('Unbilled', 'Admin', 'Unbilled Management', 'Edit'),
('Unbilled', 'Admin', 'Legacy Jobs', 'Edit'),
('Admin', 'Admin', 'User Management', 'Edit'),
('Admin', 'Admin', 'Activity Log', 'Edit'),
('Admin', 'Admin', 'Role Permissions', 'Edit')
ON CONFLICT (category, role_name, page_name) DO NOTHING;

-- Seed Default for Manager
INSERT INTO public.role_permissions (category, role_name, page_name, access_level) VALUES
('CSC', 'Manager', 'Active Jobs', 'Edit'),
('CSC', 'Manager', 'Closed Jobs', 'Edit'),
('CSC', 'Manager', 'All Jobs', 'Edit'),
('CSC', 'Manager', 'Follow-ups', 'Edit'),
('Tracking', 'Manager', 'Tracking Dashboard', 'Edit'),
('Tracking', 'Manager', 'Group Chat', 'Edit'),
('Unbilled', 'Manager', 'Unbilled Management', 'Edit'),
('Unbilled', 'Manager', 'Legacy Jobs', 'Edit')
ON CONFLICT (category, role_name, page_name) DO NOTHING;

-- Seed Default for Executive
INSERT INTO public.role_permissions (category, role_name, page_name, access_level) VALUES
('CSC', 'Executive', 'Active Jobs', 'Edit'),
('CSC', 'Executive', 'Closed Jobs', 'View'),
('CSC', 'Executive', 'All Jobs', 'View'),
('CSC', 'Executive', 'Follow-ups', 'Edit'),
('Tracking', 'Executive', 'Tracking Dashboard', 'Edit'),
('Tracking', 'Executive', 'Group Chat', 'Edit'),
('Unbilled', 'Executive', 'Unbilled Management', 'Edit'),
('Unbilled', 'Executive', 'Legacy Jobs', 'View')
ON CONFLICT (category, role_name, page_name) DO NOTHING;

-- Seed Default for Viewer
INSERT INTO public.role_permissions (category, role_name, page_name, access_level) VALUES
('CSC', 'Viewer', 'Active Jobs', 'View'),
('CSC', 'Viewer', 'Closed Jobs', 'View'),
('CSC', 'Viewer', 'All Jobs', 'View'),
('Tracking', 'Viewer', 'Tracking Dashboard', 'View'),
('Tracking', 'Viewer', 'Group Chat', 'View'),
('Unbilled', 'Viewer', 'Unbilled Management', 'View'),
('Unbilled', 'Viewer', 'Legacy Jobs', 'View')
ON CONFLICT (category, role_name, page_name) DO NOTHING;
