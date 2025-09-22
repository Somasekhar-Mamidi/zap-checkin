-- Update RLS policies for attendees table to allow public self-registration
-- First drop existing restrictive policies
DROP POLICY IF EXISTS "Only authorized users can insert attendees" ON public.attendees;

-- Create new policy that allows public self-registration
CREATE POLICY "Allow public self-registration" 
ON public.attendees 
FOR INSERT 
WITH CHECK (registration_type = 'walk_in');

-- Keep other policies for authorized users
-- (SELECT, UPDATE, DELETE policies remain the same for authorized users)