-- Update RLS policies for attendees and activity_logs to require invited users
-- Only users who have been invited or are admins can access the system

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view attendees" ON public.attendees;
DROP POLICY IF EXISTS "Authenticated users can insert attendees" ON public.attendees;
DROP POLICY IF EXISTS "Authenticated users can update attendees" ON public.attendees;
DROP POLICY IF EXISTS "Authenticated users can delete attendees" ON public.attendees;

DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can update activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can delete activity logs" ON public.activity_logs;

-- Create function to check if user has access to the platform
CREATE OR REPLACE FUNCTION public.user_has_platform_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.invited_users iu
    JOIN auth.users u ON u.email = iu.email
    WHERE u.id = _user_id AND iu.status = 'used'
  )
$$;

-- New restrictive policies for attendees
CREATE POLICY "Only authorized users can view attendees" 
ON public.attendees 
FOR SELECT 
TO authenticated 
USING (public.user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can insert attendees" 
ON public.attendees 
FOR INSERT 
TO authenticated 
WITH CHECK (public.user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can update attendees" 
ON public.attendees 
FOR UPDATE 
TO authenticated 
USING (public.user_has_platform_access(auth.uid()))
WITH CHECK (public.user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can delete attendees" 
ON public.attendees 
FOR DELETE 
TO authenticated 
USING (public.user_has_platform_access(auth.uid()));

-- New restrictive policies for activity_logs
CREATE POLICY "Only authorized users can view activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated 
USING (public.user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can insert activity logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (public.user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can update activity logs" 
ON public.activity_logs 
FOR UPDATE 
TO authenticated 
USING (public.user_has_platform_access(auth.uid()))
WITH CHECK (public.user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can delete activity logs" 
ON public.activity_logs 
FOR DELETE 
TO authenticated 
USING (public.user_has_platform_access(auth.uid()));