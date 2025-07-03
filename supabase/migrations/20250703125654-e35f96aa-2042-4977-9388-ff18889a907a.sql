
-- Update the can_create_chat function to check both is_premium and role fields
CREATE OR REPLACE FUNCTION public.can_create_chat(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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
