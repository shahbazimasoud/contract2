
'use client';

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { en } from '@/locales/en';
import { fa } from '@/locales/fa';
import get from 'lodash.get';

type Language = 'en' | 'fa';

const translations = { en, fa };

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
    const storedLanguage = localStorage.getItem('language') as Language;
    if (storedLanguage && ['en', 'fa'].includes(storedLanguage)) {
      setLanguageState(storedLanguage);
      document.documentElement.dir = storedLanguage === 'fa' ? 'rtl' : 'ltr';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  };

  const t = useMemo(() => (key: string, options?: { [key: string]: string | number }) => {
    let translation = get(translations[language], key);

    if (options) {
        Object.keys(options).forEach((k) => {
            translation = translation.replace(new RegExp(`{{${k}}}`, 'g'), options[k]);
        });
    }

    return translation || key;
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

    