-- Fix Critical RLS Security Vulnerabilities
-- Replace public role with authenticated and add proper service role checks

-- ============================================
-- 1. Create Service Role Check Function
-- ============================================
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.jwt() ->> 'role' = 'service_role';
$$;

-- ============================================
-- 2. Fix ATTENDEES table policies
-- ============================================
-- Drop existing insecure policies
DROP POLICY IF EXISTS "Only authorized users can view attendees" ON public.attendees;
DROP POLICY IF EXISTS "Only authorized users can update attendees" ON public.attendees;
DROP POLICY IF EXISTS "Only authorized users can delete attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow public self-registration" ON public.attendees;
DROP POLICY IF EXISTS "Authorized users can add pre-registered attendees" ON public.attendees;

-- Create secure policies with authenticated role
CREATE POLICY "Authenticated users can view attendees"
ON public.attendees
FOR SELECT
TO authenticated
USING (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can update attendees"
ON public.attendees
FOR UPDATE
TO authenticated
USING (user_has_platform_access(auth.uid()))
WITH CHECK (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can delete attendees"
ON public.attendees
FOR DELETE
TO authenticated
USING (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can add pre-registered attendees"
ON public.attendees
FOR INSERT
TO authenticated
WITH CHECK (user_has_platform_access(auth.uid()) AND registration_type = 'pre_registered');

-- Service role can insert walk-in registrations
CREATE POLICY "Service role can add walk-in attendees"
ON public.attendees
FOR INSERT
TO service_role
WITH CHECK (registration_type = 'walk_in');

-- ============================================
-- 3. Fix CHECKIN_INSTANCES table policies
-- ============================================
DROP POLICY IF EXISTS "Only authorized users can view checkin instances" ON public.checkin_instances;
DROP POLICY IF EXISTS "Only authorized users can insert checkin instances" ON public.checkin_instances;
DROP POLICY IF EXISTS "Only authorized users can update checkin instances" ON public.checkin_instances;
DROP POLICY IF EXISTS "Only authorized users can delete checkin instances" ON public.checkin_instances;

CREATE POLICY "Authenticated users can view checkin instances"
ON public.checkin_instances
FOR SELECT
TO authenticated
USING (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can insert checkin instances"
ON public.checkin_instances
FOR INSERT
TO authenticated
WITH CHECK (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can update checkin instances"
ON public.checkin_instances
FOR UPDATE
TO authenticated
USING (user_has_platform_access(auth.uid()))
WITH CHECK (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can delete checkin instances"
ON public.checkin_instances
FOR DELETE
TO authenticated
USING (user_has_platform_access(auth.uid()));

-- ============================================
-- 4. Fix PROFILES table policies
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- ============================================
-- 5. Fix REGISTRATION_RATE_LIMITS table policies
-- ============================================
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.registration_rate_limits;
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.registration_rate_limits;

CREATE POLICY "Admins can view rate limits"
ON public.registration_rate_limits
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert rate limits"
ON public.registration_rate_limits
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update rate limits"
ON public.registration_rate_limits
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can delete rate limits"
ON public.registration_rate_limits
FOR DELETE
TO service_role
USING (true);

-- ============================================
-- 6. Fix ACTIVITY_LOGS table policies
-- ============================================
DROP POLICY IF EXISTS "Only authorized users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Only authorized users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Only authorized users can update activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Only authorized users can delete activity logs" ON public.activity_logs;

CREATE POLICY "Authenticated users can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (user_has_platform_access(auth.uid()));

CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (user_has_platform_access(auth.uid()));

-- Service role can also insert activity logs
CREATE POLICY "Service role can insert activity logs"
ON public.activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can update activity logs"
ON public.activity_logs
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete activity logs"
ON public.activity_logs
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));