
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, useTranslations } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: ReturnType<typeof useTranslations>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const getInitialLanguage = (): Language => {
  // Try to get from localStorage first
  const savedLanguage = localStorage.getItem('preferred_language');
  if (savedLanguage && ['nl', 'en', 'ar', 'es', 'ru', 'fr'].includes(savedLanguage)) {
    return savedLanguage as Language;
  }
  
  // Try to detect browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('en')) return 'en';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('ar')) return 'ar';
  
  // Default to Dutch
  return 'nl';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage());
  const authContext = useAuth();
  const t = useTranslations(language);

  // Safely access auth context with null check
  const { user, profile, loading } = authContext || { user: null, profile: null, loading: true };

  // Load user's preferred language from profile when user logs in
  useEffect(() => {
    if (!loading && user && profile?.preferred_language) {
      console.log('🌍 Loading language from user profile:', profile.preferred_language);
      setLanguageState(profile.preferred_language as Language);
      localStorage.setItem('preferred_language', profile.preferred_language);
    }
  }, [user, profile, loading]);

  const setLanguage = async (newLanguage: Language) => {
    console.log('🌍 Setting language to:', newLanguage);
    
    // Update state immediately
    setLanguageState(newLanguage);
    
    // Save to localStorage
    localStorage.setItem('preferred_language', newLanguage);
    
    // Update user profile if logged in and not loading
    if (user && !loading) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: newLanguage })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating user language preference:', error);
        } else {
          console.log('✅ User language preference updated in profile');
        }
      } catch (error) {
        console.error('Error updating language preference:', error);
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
