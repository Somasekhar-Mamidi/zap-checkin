-- Create logs table for persistent storage
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('checkin', 'registration', 'qr_generated', 'email_sent', 'system')),
  action TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  details TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by timestamp
CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_type ON public.activity_logs(type);
CREATE INDEX idx_activity_logs_status ON public.activity_logs(status);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is event management)
CREATE POLICY "Allow all operations on activity_logs" 
ON public.activity_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_activity_logs_updated_at
BEFORE UPDATE ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();