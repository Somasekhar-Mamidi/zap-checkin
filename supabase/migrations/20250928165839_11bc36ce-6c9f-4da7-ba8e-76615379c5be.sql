-- Create checkin_instances table to track multiple check-ins for the same QR code
CREATE TABLE public.checkin_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  qr_code TEXT NOT NULL,
  checkin_number INTEGER NOT NULL DEFAULT 1,
  guest_type TEXT NOT NULL DEFAULT 'original',
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checkin_instances ENABLE ROW LEVEL SECURITY;

-- Create policies for checkin_instances
CREATE POLICY "Only authorized users can view checkin instances" 
ON public.checkin_instances 
FOR SELECT 
USING (user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can insert checkin instances" 
ON public.checkin_instances 
FOR INSERT 
WITH CHECK (user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can update checkin instances" 
ON public.checkin_instances 
FOR UPDATE 
USING (user_has_platform_access(auth.uid()))
WITH CHECK (user_has_platform_access(auth.uid()));

CREATE POLICY "Only authorized users can delete checkin instances" 
ON public.checkin_instances 
FOR DELETE 
USING (user_has_platform_access(auth.uid()));

-- Create index for better performance on QR code lookups
CREATE INDEX idx_checkin_instances_qr_code ON public.checkin_instances(qr_code);
CREATE INDEX idx_checkin_instances_attendee_id ON public.checkin_instances(attendee_id);

-- Create function to get checkin count for a QR code
CREATE OR REPLACE FUNCTION public.get_checkin_count_for_qr(qr_code_param TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(checkin_number), 0)
  FROM public.checkin_instances
  WHERE qr_code = qr_code_param;
$$;

-- Create function to determine guest type based on checkin number
CREATE OR REPLACE FUNCTION public.get_guest_type(checkin_num INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN checkin_num = 1 THEN 'original'
    WHEN checkin_num = 2 THEN 'plus_one'
    WHEN checkin_num = 3 THEN 'plus_two'
    WHEN checkin_num = 4 THEN 'plus_three'
    ELSE 'plus_' || (checkin_num - 1)::text
  END;
$$;