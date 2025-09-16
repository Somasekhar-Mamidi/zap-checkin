-- Fix critical security vulnerability: Restrict access to attendees and activity_logs tables
-- Current policies allow public access to sensitive personal information

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on attendees" ON public.attendees;
DROP POLICY IF EXISTS "Allow all operations on activity_logs" ON public.activity_logs;

-- Create secure RLS policies for attendees table
-- Only authenticated users can access attendee data
CREATE POLICY "Authenticated users can view attendees" 
ON public.attendees 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert attendees" 
ON public.attendees 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendees" 
ON public.attendees 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendees" 
ON public.attendees 
FOR DELETE 
TO authenticated 
USING (true);

-- Create secure RLS policies for activity_logs table  
-- Only authenticated users can access activity logs
CREATE POLICY "Authenticated users can view activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert activity logs" 
ON public.activity_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update activity logs" 
ON public.activity_logs 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete activity logs" 
ON public.activity_logs 
FOR DELETE 
TO authenticated 
USING (true);