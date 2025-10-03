-- Fix RLS policies for attendees table to properly block anonymous access
-- The issue: All policies are RESTRICTIVE, which allows public access by default
-- The fix: Create PERMISSIVE policy for admins, keep RESTRICTIVE for blocking anonymous

-- Drop the existing restrictive admin SELECT policy
DROP POLICY IF EXISTS "Only admins can view attendees" ON public.attendees;

-- Create a new PERMISSIVE policy for admin SELECT access
-- This explicitly grants access to admins
CREATE POLICY "Admins can view all attendees"
ON public.attendees
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- The existing RESTRICTIVE "Deny anonymous select on attendees" policy will continue to block anonymous access
-- This combination ensures:
-- 1. Anonymous users are blocked by the RESTRICTIVE policy
-- 2. Authenticated admins are granted access by the PERMISSIVE policy
-- 3. Non-admin authenticated users have no PERMISSIVE policy granting them access, so they're blocked

-- Also fix profiles and registration_rate_limits tables with the same issue

-- Profiles table fix
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Registration rate limits fix
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.registration_rate_limits;
CREATE POLICY "Admins can view rate limits"
ON public.registration_rate_limits
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));