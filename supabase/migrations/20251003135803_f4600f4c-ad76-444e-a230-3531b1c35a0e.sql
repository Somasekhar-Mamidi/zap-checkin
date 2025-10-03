-- Fix profiles table to block anonymous SELECT access
-- Drop the existing "Deny all anonymous access to profiles" policy as it applies to ALL commands
-- and may not be effectively blocking SELECT operations
DROP POLICY IF EXISTS "Deny all anonymous access to profiles" ON public.profiles;

-- Drop existing SELECT policies to recreate them with explicit authentication checks
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a restrictive policy that requires authentication for all SELECT operations
CREATE POLICY "Require authentication for SELECT on profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Recreate admin view policy with explicit authentication check
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

-- Recreate user self-view policy with explicit authentication check  
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Add a general restrictive policy to block all anonymous access for other operations
CREATE POLICY "Block all anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix attendees table to block anonymous SELECT access
DROP POLICY IF EXISTS "Deny all anonymous access to attendees" ON public.attendees;
DROP POLICY IF EXISTS "Deny anonymous select on attendees" ON public.attendees;
DROP POLICY IF EXISTS "Only admins can view attendees" ON public.attendees;

-- Create restrictive policy requiring authentication for SELECT
CREATE POLICY "Require authentication for SELECT on attendees"
ON public.attendees
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Recreate admin view policy
CREATE POLICY "Only admins can view attendees"
ON public.attendees
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_admin(auth.uid()));

-- Block all anonymous access for other operations
CREATE POLICY "Block all anonymous access to attendees"
ON public.attendees
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Fix activity_logs table to block anonymous SELECT access
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;

-- Create restrictive policy requiring authentication for SELECT
CREATE POLICY "Require authentication for SELECT on activity_logs"
ON public.activity_logs
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Recreate the policy with explicit authentication check
CREATE POLICY "Authenticated users can view activity logs"
ON public.activity_logs
FOR SELECT
USING (auth.uid() IS NOT NULL AND user_has_platform_access(auth.uid()));

-- Block all anonymous access for other operations
CREATE POLICY "Block all anonymous access to activity_logs"
ON public.activity_logs
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);