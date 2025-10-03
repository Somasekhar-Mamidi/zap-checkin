-- Fix attendees SELECT policy to allow all platform users, not just admins
DROP POLICY IF EXISTS "Admins can view all attendees" ON public.attendees;

CREATE POLICY "Authenticated users can view attendees"
ON public.attendees
FOR SELECT
TO authenticated
USING (user_has_platform_access(auth.uid()));