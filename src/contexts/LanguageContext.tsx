import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  shouldStartTour: boolean;
  setShouldStartTour: (value: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n, t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { preferences, updatePreference, loading } = useUserPreferences();
  const [shouldStartTour, setShouldStartTour] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [lastProcessedLanguage, setLastProcessedLanguage] = useState<string | null>(null);

  // Initialize language for non-authenticated users
  useEffect(() => {
    if (!isAuthenticated && !isChangingLanguage) {
      const savedLanguage = localStorage.getItem('selectedLanguage') || 'en';
      if (savedLanguage !== i18n.language) {
        console.log('LanguageContext: Setting language for non-authenticated user:', savedLanguage);
        setIsChangingLanguage(true);
        i18n.changeLanguage(savedLanguage).finally(() => setIsChangingLanguage(false));
      }
    }
  }, [isAuthenticated, i18n, isChangingLanguage]);

  // Handle authenticated user language preferences
  useEffect(() => {
    if (!isAuthenticated || !user || loading || isChangingLanguage) {
      return;
    }

    const dbLanguage = preferences.language?.value;
    const currentLanguage = i18n.language;
    
    // Skip if we've already processed this exact language preference
    if (lastProcessedLanguage === dbLanguage && dbLanguage === currentLanguage) {
      return;
    }

    if (dbLanguage) {
      // User has a database preference - use it
      if (dbLanguage !== currentLanguage) {
        console.log('LanguageContext: Applying database language preference:', dbLanguage);
        localStorage.setItem('selectedLanguage', dbLanguage);
        setIsChangingLanguage(true);
        i18n.changeLanguage(dbLanguage).finally(() => {
          setIsChangingLanguage(false);
          setLastProcessedLanguage(dbLanguage);
        });
      } else {
        // Language matches, just sync localStorage
        localStorage.setItem('selectedLanguage', dbLanguage);
        setLastProcessedLanguage(dbLanguage);
      }
    } else {
      // No database preference - check localStorage and save to database
      const localLanguage = localStorage.getItem('selectedLanguage');
      if (localLanguage && localLanguage !== 'en' && localLanguage !== lastProcessedLanguage) {
        console.log('LanguageContext: Saving localStorage language to database:', localLanguage);
        updatePreference('language', localLanguage).catch(error => {
          console.error('Failed to save language preference to database:', error);
        });
        setLastProcessedLanguage(localLanguage);
      }
    }
  }, [isAuthenticated, user, preferences.language?.value, i18n.language, loading, isChangingLanguage, lastProcessedLanguage, updatePreference]);

  // Handle onboarding tour
  useEffect(() => {
    if (isAuthenticated && !loading && preferences.firstTimeLogin?.value === 'true' && preferences.onboardingCompleted?.value !== 'true') {
      setShouldStartTour(true);
    }
  }, [isAuthenticated, loading, preferences.firstTimeLogin?.value, preferences.onboardingCompleted?.value]);

  // Reset tracking when user changes
  useEffect(() => {
    setLastProcessedLanguage(null);
  }, [isAuthenticated, user?.id]);

  const changeLanguage = async (language: string) => {
    // Prevent multiple simultaneous language changes
    if (isChangingLanguage) {
      return;
    }
    
    try {
      setIsChangingLanguage(true);
      await i18n.changeLanguage(language);
      
      // Always update localStorage
      localStorage.setItem('selectedLanguage', language);
      
      // Only update database if user is authenticated
      if (isAuthenticated && user) {
        await updatePreference('language', language);
        console.log('LanguageContext: Language preference saved to database:', language);
      } else {
        console.log('LanguageContext: Language preference saved to localStorage:', language);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChangingLanguage(false);
    }
  };



  const value: LanguageContextType = {
    currentLanguage: i18n.language,
    changeLanguage,
    t,
    shouldStartTour,
    setShouldStartTour,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
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