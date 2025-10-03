-- Fix the handle_new_user trigger to use case-insensitive email matching
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );

  -- Check if user was invited using case-insensitive email comparison
  IF EXISTS (
    SELECT 1 FROM public.invited_users 
    WHERE LOWER(email) = LOWER(NEW.email) AND status = 'pending'
  ) THEN
    -- Mark invitation as used (case-insensitive)
    UPDATE public.invited_users 
    SET status = 'used', used_at = now() 
    WHERE LOWER(email) = LOWER(NEW.email) AND status = 'pending';
    
    -- Assign user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Log successful invitation processing
    RAISE NOTICE 'User % successfully assigned role via invitation', NEW.email;
  ELSE
    -- Check if this is the very first user and make them super_admin
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'super_admin');
      
      RAISE NOTICE 'First user % assigned super_admin role', NEW.email;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Fix existing users who signed up but don't have roles
-- First, mark their invitations as used
UPDATE public.invited_users 
SET status = 'used', used_at = now()
WHERE status = 'pending' 
  AND LOWER(email) IN (
    SELECT LOWER(email) FROM auth.users
  );

-- Then assign user roles to anyone who was invited but doesn't have a role yet
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
INNER JOIN public.invited_users iu ON LOWER(u.email) = LOWER(iu.email)
WHERE iu.status = 'used'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
  );