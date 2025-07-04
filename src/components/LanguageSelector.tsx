
import React from 'react';
import { Earth } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages, Language } from '@/lib/i18n';

const languageNames: Record<Language, string> = {
  nl: 'Nederlands',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  ru: 'Русский',
  fr: 'Français'
};

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Select language"
        >
          <Earth className="h-5 w-5 text-blue-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`cursor-pointer ${
              language === lang ? 'bg-gray-100 dark:bg-gray-800' : ''
            }`}
          >
            {languageNames[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
