-- Fix security warnings by setting proper search_path for functions

-- Fix the update_chat_session_updated_at function
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;