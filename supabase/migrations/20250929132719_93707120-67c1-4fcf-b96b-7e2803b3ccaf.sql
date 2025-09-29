-- Add RLS policy to allow authorized users to insert pre-registered attendees
CREATE POLICY "Authorized users can add pre-registered attendees" 
ON public.attendees 
FOR INSERT 
WITH CHECK (
  user_has_platform_access(auth.uid()) AND 
  registration_type = 'pre_registered'
);