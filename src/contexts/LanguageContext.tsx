import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import LanguageSelectionDialog from '@/components/LanguageSelectionDialog';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n, t } = useTranslation();
  const { preferences, updatePreference, loading } = useUserPreferences();
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Check if user is first-time using the firstTimeLogin flag
  useEffect(() => {
    if (!loading && preferences.firstTimeLogin?.value === 'true') {
      setIsFirstTimeUser(true);
      setShowLanguageDialog(true);
    } else if (preferences.language?.value && preferences.language.value !== i18n.language) {
      i18n.changeLanguage(preferences.language.value);
    }
  }, [preferences.language, preferences.firstTimeLogin, i18n, loading]);

  const changeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      await updatePreference('language', language);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleLanguageSelection = async (language: string) => {
    try {
      await changeLanguage(language);
      await updatePreference('firstTimeLogin', 'false');
      setShowLanguageDialog(false);
      setIsFirstTimeUser(false);
    } catch (error) {
      console.error('Failed to set initial language:', error);
    }
  };

  const value: LanguageContextType = {
    currentLanguage: i18n.language,
    changeLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <LanguageSelectionDialog
        open={showLanguageDialog}
        onLanguageSelect={handleLanguageSelection}
      />
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;