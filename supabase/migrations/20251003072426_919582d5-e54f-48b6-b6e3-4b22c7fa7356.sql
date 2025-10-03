-- Secure registration_tokens table: Ensure explicit authentication requirements
-- Current policies only allow admins, but we'll make them more explicit about denying anonymous access

-- Drop existing policies to recreate them with explicit authentication checks
DROP POLICY IF EXISTS "Admins can view all tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Admins can create tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Admins can update tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Admins can delete tokens" ON public.registration_tokens;

-- Create new policies with explicit authentication requirements
-- These policies explicitly check that the user is authenticated AND is an admin

CREATE POLICY "Only authenticated admins can view tokens" 
ON public.registration_tokens 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only authenticated admins can create tokens" 
ON public.registration_tokens 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only authenticated admins can update tokens" 
ON public.registration_tokens 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only authenticated admins can delete tokens" 
ON public.registration_tokens 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Add explicit deny policy for anonymous users (belt and suspenders approach)
CREATE POLICY "Deny all anonymous access to tokens" 
ON public.registration_tokens 
FOR ALL
TO anon
USING (false);