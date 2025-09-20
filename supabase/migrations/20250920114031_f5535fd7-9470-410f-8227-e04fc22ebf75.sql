-- Add registration_type column to attendees table
ALTER TABLE public.attendees 
ADD COLUMN registration_type TEXT NOT NULL DEFAULT 'pre_registered';

-- Add check constraint to ensure only valid registration types
ALTER TABLE public.attendees 
ADD CONSTRAINT attendees_registration_type_check 
CHECK (registration_type IN ('pre_registered', 'walk_in'));

-- Add index for better performance when filtering by registration type
CREATE INDEX idx_attendees_registration_type ON public.attendees(registration_type);

-- Update existing records to be 'pre_registered' (they're already defaulted, but being explicit)
UPDATE public.attendees SET registration_type = 'pre_registered' WHERE registration_type IS NULL;