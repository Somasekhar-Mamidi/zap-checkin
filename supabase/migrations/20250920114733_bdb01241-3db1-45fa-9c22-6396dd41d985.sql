-- Add company column to attendees table
ALTER TABLE public.attendees 
ADD COLUMN company TEXT;