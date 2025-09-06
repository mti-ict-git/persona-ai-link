import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSelectionDialog from '@/components/LanguageSelectionDialog';

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
  const { preferences, updatePreference, loading, refreshPreferences } = useUserPreferences();
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [shouldStartTour, setShouldStartTour] = useState(false);

  // Check if user is first-time using the firstTimeLogin flag
  useEffect(() => {
    console.log('🔍 LanguageContext useEffect triggered', {
      isAuthenticated,
      user: user?.id,
      loading,
      preferences: {
        firstTimeLogin: preferences.firstTimeLogin?.value,
        language: preferences.language?.value,
        onboardingCompleted: preferences.onboardingCompleted?.value
      },
      showLanguageDialog,
      isFirstTimeUser,
      shouldStartTour
    });
    
    // Only check preferences if user is authenticated
    if (!isAuthenticated || !user) {
        console.log('❌ User not authenticated or user object missing');
        return;
      }
    
    if (!loading) {
      // Show language dialog if first time login OR if language is not set
      const shouldShowDialog = preferences.firstTimeLogin?.value === 'true' || !preferences.language?.value;
      console.log('🎯 Language dialog decision:', {
          firstTimeLogin: preferences.firstTimeLogin?.value,
          language: preferences.language?.value,
          onboardingCompleted: preferences.onboardingCompleted?.value,
          shouldShowDialog,
          currentShowState: showLanguageDialog,
          isFirstTimeUser,
          shouldStartTour,
          currentI18nLanguage: i18n.language
        });
        
        if (shouldShowDialog) {
          console.log('✅ Setting language dialog to show - FIRST TIME USER DETECTED');
          setIsFirstTimeUser(true);
          setShowLanguageDialog(true);
        } else if (preferences.language?.value && preferences.language.value !== i18n.language) {
          console.log('🌐 Changing language to:', preferences.language.value, 'from:', i18n.language);
          i18n.changeLanguage(preferences.language.value);
        } else {
          console.log('🚫 No language dialog needed - user already configured');
        }
    }
  }, [isAuthenticated, user, preferences.language, preferences.firstTimeLogin, i18n, loading, showLanguageDialog, isFirstTimeUser, shouldStartTour]);

  const changeLanguage = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      await updatePreference('language', language);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleLanguageSelection = async (language: string) => {
    console.log('🎯 handleLanguageSelection called with:', {
      language,
      isFirstTimeUser,
      currentShouldStartTour: shouldStartTour,
      showLanguageDialog,
      preferences: {
        firstTimeLogin: preferences.firstTimeLogin?.value,
        onboardingCompleted: preferences.onboardingCompleted?.value
      }
    });
    
    try {
      console.log('📝 Changing language and updating preferences...');
      await changeLanguage(language);
      await updatePreference('firstTimeLogin', 'false');
      
      console.log('🔄 Force refreshing preferences...');
      // Force refresh preferences to ensure updated values are loaded
      await refreshPreferences();
      
      console.log('❌ Hiding language dialog');
      setShowLanguageDialog(false);
      setIsFirstTimeUser(false);
      
      // Trigger tour for first-time users after language selection
      if (isFirstTimeUser && preferences.onboardingCompleted?.value !== 'true') {
        console.log('🚀 Setting shouldStartTour to TRUE for first-time user');
        setShouldStartTour(true);
      } else {
        console.log('🚫 Not setting shouldStartTour - user is not first-time or onboarding completed');
      }
      
      console.log('✅ Language selection completed successfully');
    } catch (error) {
      console.error('❌ Failed to set initial language:', error);
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