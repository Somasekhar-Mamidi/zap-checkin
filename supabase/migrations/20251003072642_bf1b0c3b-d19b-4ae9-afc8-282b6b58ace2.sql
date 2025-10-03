-- Secure profiles table: Add explicit deny policy for anonymous users
-- The profiles table contains PII (emails, names) and must be protected from unauthenticated access

-- Add explicit deny policy for anonymous users to prevent any unauthenticated access
CREATE POLICY "Deny all anonymous access to profiles" 
ON public.profiles 
FOR ALL
TO anon
USING (false);

-- This policy ensures that:
-- 1. Anonymous users cannot SELECT any profile data
-- 2. Anonymous users cannot INSERT, UPDATE, or DELETE profiles
-- 3. Only authenticated users with proper permissions (via existing policies) can access profiles