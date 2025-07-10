
-- Remove the insecure debug policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Allow all SELECT for debug" ON public.profiles;

-- Add proper INSERT policy for profile creation (only allow users to create their own profile)
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Add secure UPDATE policy that prevents users from modifying sensitive fields
CREATE POLICY "Users can update non-sensitive profile fields" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from updating role or premium status
    OLD.role = NEW.role AND
    OLD.is_premium = NEW.is_premium
  );

-- Create admin-only function for role management
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role user_role,
  new_is_premium BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  -- Update the target user's role
  UPDATE public.profiles
  SET 
    role = new_role,
    is_premium = COALESCE(new_is_premium, is_premium),
    updated_at = NOW()
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Add constraints to prevent direct role manipulation
ALTER TABLE public.profiles ADD CONSTRAINT check_role_consistency 
  CHECK (
    CASE 
      WHEN role = 'premium' THEN is_premium = true
      WHEN role = 'admin' THEN is_premium = true  
      ELSE true
    END
  );

-- Add audit logging table for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
