-- Fix critical security issue: Restrict profile visibility
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Fix critical security issue: Restrict role visibility  
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Create secure policy for user roles - admin access only
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Allow users to check their own role for app functionality
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);