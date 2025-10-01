-- Fix registration_tokens table RLS policies
-- Replace public role with authenticated

DROP POLICY IF EXISTS "Admins can view all tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Admins can create tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Admins can update tokens" ON public.registration_tokens;
DROP POLICY IF EXISTS "Admins can delete tokens" ON public.registration_tokens;

-- Create secure policies with authenticated role
CREATE POLICY "Admins can view all tokens"
ON public.registration_tokens
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create tokens"
ON public.registration_tokens
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tokens"
ON public.registration_tokens
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tokens"
ON public.registration_tokens
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));