
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, preferredLanguage?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to sanitize and validate profile updates
const sanitizeProfileUpdates = (updates: Partial<Profile>): Partial<Profile> => {
  // Only allow specific non-sensitive fields to be updated
  const allowedFields = [
    'first_name',
    'last_name', 
    'preferred_language',
    'email'
  ] as const;
  
  const sanitized: Partial<Profile> = {};
  
  for (const field of allowedFields) {
    if (field in updates && updates[field] !== undefined) {
      let value = updates[field];
      
      // Sanitize string inputs to prevent XSS
      if (typeof value === 'string') {
        value = value.trim();
        // Basic XSS prevention - remove script tags and javascript: protocols
        value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        value = value.replace(/javascript:/gi, '');
        
        // Validate length
        if (field === 'first_name' || field === 'last_name') {
          if (value.length > 50) {
            throw new Error(`${field} must be 50 characters or less`);
          }
        }
        if (field === 'email' && value.length > 254) {
          throw new Error('Email must be 254 characters or less');
        }
      }
      
      // Validate preferred_language enum
      if (field === 'preferred_language') {
        const validLanguages = ['nl', 'en', 'ar', 'es', 'ru', 'fr', 'pl', 'de'];
        if (!validLanguages.includes(value as string)) {
          throw new Error('Invalid language selection');
        }
      }
      
      sanitized[field] = value;
    }
  }
  
  return sanitized;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setProfile(data);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  useEffect(() => {
    // Устанавливаем слушатель изменений аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Загружаем профиль пользователя при входе
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Проверяем существующую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, preferredLanguage = 'nl') => {
    // Input validation and sanitization
    if (!email || !password) {
      return { error: new Error('Email and password are required') };
    }
    
    if (password.length < 6) {
      return { error: new Error('Password must be at least 6 characters') };
    }
    
    // Sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFirstName = firstName?.trim().substring(0, 50);
    const sanitizedLastName = lastName?.trim().substring(0, 50);
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          preferred_language: preferredLanguage
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Input validation
    if (!email || !password) {
      return { error: new Error('Email and password are required') };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    try {
      // Sanitize and validate the updates
      const sanitizedUpdates = sanitizeProfileUpdates(updates);
      
      if (Object.keys(sanitizedUpdates).length === 0) {
        return { error: new Error('No valid fields to update') };
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', user.id);
      
      if (!error && profile) {
        setProfile({ ...profile, ...sanitizedUpdates });
      }
      
      return { error };
    } catch (validationError) {
      return { error: validationError };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
