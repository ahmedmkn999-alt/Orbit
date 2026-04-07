import en from './en';
import ar from './ar';

const translations = { en, ar };

export const getTranslation = (lang, key) => {
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (!value) return key; // fallback to key if not found
  }
  
  return value;
};

export const getSupportedLanguages = () => ['en', 'ar'];

export default translations;
