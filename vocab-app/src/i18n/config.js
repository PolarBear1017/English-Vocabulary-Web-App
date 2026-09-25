import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhTW from './locales/zh-TW.json';
import en from './locales/en.json';

export const defaultLng = 'zh-TW';
export const supportedLngs = ['zh-TW', 'en'];

export const resources = {
  'zh-TW': { translation: zhTW },
  en: { translation: en }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLng,
    supportedLngs,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ui_language'
    }
  });

if (typeof document !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
  // 初始化當前 lang
  document.documentElement.lang = i18n.resolvedLanguage || defaultLng;
}

export default i18n;
