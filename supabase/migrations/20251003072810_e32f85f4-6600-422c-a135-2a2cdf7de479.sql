-- Secure attendees table: Add explicit restrictive deny policy for anonymous users
-- The attendees table contains highly sensitive PII (names, emails, phones, companies)
-- and must be completely inaccessible to unauthenticated users

-- Add explicit RESTRICTIVE deny policy for anonymous users
-- RESTRICTIVE policies are AND'ed with other policies, providing defense in depth
CREATE POLICY "Deny all anonymous access to attendees" 
ON public.attendees 
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- This restrictive policy ensures that:
-- 1. Anonymous users are explicitly blocked from any operation (SELECT, INSERT, UPDATE, DELETE)
-- 2. Even if permissive policies are added in the future, this policy will prevent anonymous access
-- 3. Provides defense in depth alongside existing admin-only policies