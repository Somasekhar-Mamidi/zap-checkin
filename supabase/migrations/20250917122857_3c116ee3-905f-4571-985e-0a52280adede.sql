-- Create a public bucket for QR images if it doesn't exist
insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

-- Allow public read access to files in the qr-codes bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public read access to qr-codes'
  ) THEN
    CREATE POLICY "Public read access to qr-codes"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'qr-codes');
  END IF;
END $$;