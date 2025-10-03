-- Add explicit RESTRICTIVE policy to deny anonymous SELECT on attendees table
-- This ensures that unauthenticated users cannot query sensitive PII
CREATE POLICY "Deny anonymous select on attendees"
ON public.attendees
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);