import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation, getSupportedLanguages } from '../i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('orbit_language');
    if (saved && getSupportedLanguages().includes(saved)) {
      return saved;
    }
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    return getSupportedLanguages().includes(browserLang) ? browserLang : 'ar';
  });

  const [direction, setDirection] = useState(language === 'ar' ? 'rtl' : 'ltr');

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('orbit_language', language);
    
    // Update document direction
    const newDirection = language === 'ar' ? 'rtl' : 'ltr';
    setDirection(newDirection);
    document.documentElement.dir = newDirection;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, fallback = '') => {
    const translation = getTranslation(language, key);
    return translation || fallback || key;
  };

  const changeLanguage = (newLang) => {
    if (getSupportedLanguages().includes(newLang)) {
      setLanguage(newLang);
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    changeLanguage(newLang);
  };

  const value = {
    language,
    direction,
    t,
    changeLanguage,
    toggleLanguage,
    supportedLanguages: getSupportedLanguages(),
    isRTL: direction === 'rtl'
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LanguageContext;
