import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";

// Load English translations for tests
i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
});
