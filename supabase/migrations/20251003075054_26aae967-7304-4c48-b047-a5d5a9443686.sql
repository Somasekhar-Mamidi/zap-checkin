-- Add explicit RESTRICTIVE policy to deny anonymous access to invited_users table
-- This ensures that unauthenticated users cannot query email addresses
CREATE POLICY "Deny anonymous access to invited_users"
ON public.invited_users
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);