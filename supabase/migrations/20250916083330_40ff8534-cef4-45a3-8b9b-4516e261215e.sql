-- Make somasekhar.mamidi@juspay.in a Super Admin
-- First, add them to invited users as 'used' status
INSERT INTO public.invited_users (email, status, invited_at, used_at)
VALUES ('somasekhar.mamidi@juspay.in', 'used', now(), now())
ON CONFLICT (email) DO UPDATE SET 
    status = 'used',
    used_at = now();

-- If the user already exists in auth.users, assign them super_admin role
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'somasekhar.mamidi@juspay.in';
    
    -- If user exists, ensure they have super_admin role
    IF user_uuid IS NOT NULL THEN
        -- Remove any existing roles for this user
        DELETE FROM public.user_roles WHERE user_id = user_uuid;
        
        -- Add super_admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_uuid, 'super_admin');
        
        -- Ensure profile exists
        INSERT INTO public.profiles (user_id, email, full_name)
        VALUES (user_uuid, 'somasekhar.mamidi@juspay.in', 'Somasekhar Mamidi')
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email;
    END IF;
END $$;