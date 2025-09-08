-- Create attendees table
CREATE TABLE public.attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Create policies - Allow all operations for now (no authentication required)
CREATE POLICY "Allow all operations on attendees" 
ON public.attendees 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attendees_updated_at
BEFORE UPDATE ON public.attendees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.attendees (name, email, phone, checked_in, checked_in_at, qr_code) VALUES
('John Doe', 'john@example.com', '+1234567890', true, now(), 'EVT-001-JOHN'),
('Jane Smith', 'jane@example.com', '+1234567891', false, null, 'EVT-002-JANE'),
('Mike Johnson', 'mike@example.com', '+1234567892', true, now(), 'EVT-003-MIKE');