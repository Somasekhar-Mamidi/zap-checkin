-- Create registration tokens table
CREATE TABLE public.registration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Create registration rate limits table for database-backed rate limiting
CREATE TABLE public.registration_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_ip)
);

-- Enable RLS on both tables
ALTER TABLE public.registration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for registration_tokens
CREATE POLICY "Admins can view all tokens"
ON public.registration_tokens
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create tokens"
ON public.registration_tokens
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tokens"
ON public.registration_tokens
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tokens"
ON public.registration_tokens
FOR DELETE
USING (is_admin(auth.uid()));

-- RLS Policies for registration_rate_limits
CREATE POLICY "Admins can view rate limits"
ON public.registration_rate_limits
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage rate limits"
ON public.registration_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster token lookups
CREATE INDEX idx_registration_tokens_token ON public.registration_tokens(token);
CREATE INDEX idx_registration_tokens_active ON public.registration_tokens(is_active, expires_at);
CREATE INDEX idx_registration_rate_limits_ip ON public.registration_rate_limits(client_ip);

-- Create function to cleanup expired tokens (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.registration_tokens
  SET is_active = false
  WHERE expires_at < now() AND is_active = true;
END;
$$;