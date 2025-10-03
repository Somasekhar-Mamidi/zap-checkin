-- Fix security issue: Restrict attendee data access to admin users only
-- The attendees table contains sensitive PII (names, emails, phones) that should only be accessible to admins

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view attendees" ON public.attendees;
DROP POLICY IF EXISTS "Authenticated users can update attendees" ON public.attendees;
DROP POLICY IF EXISTS "Authenticated users can delete attendees" ON public.attendees;

-- Create new admin-only policies for SELECT, UPDATE, and DELETE
CREATE POLICY "Only admins can view attendees" 
ON public.attendees 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update attendees" 
ON public.attendees 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete attendees" 
ON public.attendees 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Note: INSERT policies remain unchanged:
-- 1. "Authenticated users can add pre-registered attendees" - allows admins to add attendees
-- 2. "Service role can add walk-in attendees" - allows the self-register edge function to work