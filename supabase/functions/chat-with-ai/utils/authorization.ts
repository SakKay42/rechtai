
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface UserProfile {
  role: 'user' | 'premium' | 'admin';
  is_premium: boolean;
  chat_count_current_month: number;
}

export async function validateUserAccess(
  supabase: any,
  userId: string
): Promise<{ authorized: boolean; profile?: UserProfile; error?: string }> {
  try {
    // Get user profile with role and premium status
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_premium, chat_count_current_month')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return { authorized: false, error: 'User profile not found' };
    }

    // Check if user can create a chat using the database function
    const { data: canCreate, error: functionError } = await supabase
      .rpc('can_create_chat', { user_uuid: userId });

    if (functionError) {
      console.error('Error checking chat permissions:', functionError);
      return { authorized: false, error: 'Unable to verify chat permissions' };
    }

    if (!canCreate) {
      const maxChats = profile.role === 'user' ? 1 : 'unlimited';
      return { 
        authorized: false, 
        error: `Chat limit exceeded. ${profile.role === 'user' ? 'Free users can send 1 chat per month.' : 'Please contact support.'}` 
      };
    }

    return { authorized: true, profile };
  } catch (error) {
    console.error('Authorization check failed:', error);
    return { authorized: false, error: 'Authorization check failed' };
  }
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input');
  }

  // Trim and limit length
  const sanitized = input.trim();
  
  if (sanitized.length === 0) {
    throw new Error('Input cannot be empty');
  }
  
  if (sanitized.length > 10000) {
    throw new Error('Input too long (max 10,000 characters)');
  }

  // Basic XSS prevention
  const cleaned = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return cleaned;
}
