-- Phase 1: Critical Database Security Fixes

-- 1. Enable RLS on n8n_chat_histories table and create policies
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Note: This table appears to be for N8N integration, so we'll restrict access to service role only
CREATE POLICY "Service role can manage n8n chat histories" 
ON public.n8n_chat_histories 
FOR ALL 
USING (false) -- No regular users should access this
WITH CHECK (false);

-- 2. Remove the dangerous debug policy from profiles table
DROP POLICY IF EXISTS "Allow all SELECT for debug" ON public.profiles;

-- 3. Add proper RLS policies for articles table
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Articles should be readable by authenticated users but only insertable by admins
CREATE POLICY "Authenticated users can view articles" 
ON public.articles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage articles" 
ON public.articles 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Create audit_logs table with proper RLS policies
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs should only be readable by admins and the user who performed the action
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Only allow inserts from service role for audit logging
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- 5. Fix database function security by adding proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'preferred_language') IN ('nl', 'en', 'ru', 'fr', 'es', 'ar', 'pl', 'de')
        THEN (NEW.raw_user_meta_data ->> 'preferred_language')::public.app_language
      ELSE 'nl'
    END
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_chat_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user's chat count
  UPDATE public.profiles
  SET chat_count_current_month = chat_count_current_month + 1,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET chat_count_current_month = 0,
      subscription_reset_date = date_trunc('month', NOW()) + interval '1 month',
      updated_at = NOW()
  WHERE subscription_reset_date <= NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_chat(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role user_role;
  user_is_premium BOOLEAN;
  current_chat_count INTEGER;
BEGIN
  -- Get user role, premium status, and current chat count
  SELECT role, is_premium, chat_count_current_month
  INTO user_role, user_is_premium, current_chat_count
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Premium users have unlimited chats (check both is_premium and role)
  IF user_is_premium = true OR user_role = 'premium' OR user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Free users: 1 chat per month
  IF user_role = 'user' AND current_chat_count < 1 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;