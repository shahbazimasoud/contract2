
'use client';

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { en } from '@/locales/en';
import { fa } from '@/locales/fa';
import get from 'lodash.get';

type Language = 'en' | 'fa';

const translations = { en, fa };
const AUTH_USER_KEY = 'current_user';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string,
  options?: { [key: string]: string | number }
  ) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const user = localStorage.getItem(AUTH_USER_KEY);
    const userId = user ? JSON.parse(user).id : null;
    const storedLanguage = userId ? localStorage.getItem(`language_${userId}`) as Language : null;

    if (storedLanguage && ['en', 'fa'].includes(storedLanguage)) {
      setLanguageState(storedLanguage);
    } else {
        // Fallback to general language setting if user-specific one is not found
        const generalLanguage = localStorage.getItem('language') as Language;
        if (generalLanguage && ['en', 'fa'].includes(generalLanguage)) {
            setLanguageState(generalLanguage);
        }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const user = localStorage.getItem(AUTH_USER_KEY);
    const userId = user ? JSON.parse(user).id : null;
    if (userId) {
        localStorage.setItem(`language_${userId}`, lang);
    } else {
        localStorage.setItem('language', lang); // Fallback for login page
    }
  };

  const t = useMemo(() => (key: string, options?: { [key: string]: string | number }) => {
    let translation = get(translations[language], key);

    if (!translation) {
      // Fallback to English if translation is missing
      translation = get(translations.en, key);
    }
    
    // If translation is still not found, return the key itself.
    if (typeof translation !== 'string') {
        return key;
    }

    if (options) {
        Object.keys(options).forEach((k) => {
            const value = options[k];
            if (value !== undefined) {
                translation = translation.replace(new RegExp(`{{${k}}}`, 'g'), String(value));
            }
        });
    }

    return translation;
  }, [language]);


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
