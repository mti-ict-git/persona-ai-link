import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language files
import enCommon from '../locales/en/common.json';
import zhCommon from '../locales/zh/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  zh: {
    common: zhCommon,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default to English
    fallbackLng: 'en',
    debug: false,
    
    // Default namespace
    defaultNS: 'common',
    
    // Key separator
    keySeparator: '.',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;