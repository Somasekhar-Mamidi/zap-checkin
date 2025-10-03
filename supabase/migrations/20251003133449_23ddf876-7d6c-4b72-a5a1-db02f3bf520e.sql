-- Fix security issue: Restrict attendee data access to admins only
-- Drop the overly permissive SELECT policy that allowed all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view attendees" ON public.attendees;

-- Create a new restrictive policy that only allows admins to view attendee data
CREATE POLICY "Only admins can view attendees"
ON public.attendees
FOR SELECT
USING (is_admin(auth.uid()));

-- Note: This policy uses the existing is_admin() function which checks for 
-- 'super_admin' or 'admin' roles, protecting sensitive PII data from unauthorized access