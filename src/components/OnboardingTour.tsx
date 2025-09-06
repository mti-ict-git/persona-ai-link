import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useTheme } from '../contexts/ThemeContext';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, onComplete }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { updatePreference } = useUserPreferences();
  const [stepIndex, setStepIndex] = useState(0);

  // Define tour steps based on user role
  const getTourSteps = (): Step[] => {
    const baseSteps: Step[] = [
      {
        target: '[data-tour="welcome"]',
        content: t('onboarding.welcome.content'),
        title: t('onboarding.welcome.title'),
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="sidebar"]',
        content: t('onboarding.sidebar.content'),
        title: t('onboarding.sidebar.title'),
        placement: 'right',
      },
      {
        target: '[data-tour="new-chat"]',
        content: t('onboarding.newChat.content'),
        title: t('onboarding.newChat.title'),
        placement: 'right',
      },
      {
        target: '[data-tour="chat-input"]',
        content: t('onboarding.chatInput.content'),
        title: t('onboarding.chatInput.title'),
        placement: 'top',
      },
      // Language toggle is in a dialog, skip for now
      // {
      //   target: '[data-tour="language-toggle"]',
      //   content: t('onboarding.language.content'),
      //   title: t('onboarding.language.title'),
      //   placement: 'bottom',
      // },
      {
        target: '[data-tour="theme-toggle"]',
        content: t('onboarding.theme.content'),
        title: t('onboarding.theme.title'),
        placement: 'bottom',
        disableBeacon: false,
        spotlightClicks: true,
      },
      {
        target: '[data-tour="settings"]',
        content: t('onboarding.settings.content'),
        title: t('onboarding.settings.title'),
        placement: 'right',
      },
    ];

    // Add admin-specific steps for admin users
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      baseSteps.push({
        target: '[data-tour="admin-panel"]',
        content: t('onboarding.adminPanel.content'),
        title: t('onboarding.adminPanel.title'),
        placement: 'right',
      });
    }

    // Add completion step
    baseSteps.push({
      target: '[data-tour="completion"]',
      content: t('onboarding.completion.content'),
      title: t('onboarding.completion.title'),
      placement: 'center',
      hideFooter: true,
    });

    return baseSteps;
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      // Mark tour as completed in user preferences
      updatePreference('onboardingCompleted', 'true');
      onComplete();
      onClose();
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  // Custom styles for Shadcn UI integration
  const joyrideStyles = {
    options: {
      primaryColor: 'hsl(var(--primary))',
      backgroundColor: 'hsl(var(--background))',
      textColor: 'hsl(var(--foreground))',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.3)',
      zIndex: 10000,
    },
    tooltip: {
      backgroundColor: 'hsl(var(--background))',
      borderRadius: '8px',
      color: 'hsl(var(--foreground))',
      fontSize: '14px',
      padding: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      maxWidth: '400px',
      border: '1px solid hsl(var(--border))',
    },
    tooltipTitle: {
      color: 'hsl(var(--primary))',
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '8px',
    },
    tooltipContent: {
      lineHeight: 1.5,
      marginBottom: '16px',
      color: 'hsl(var(--muted-foreground))',
    },
    buttonNext: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderRadius: '6px',
      border: 'none',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    buttonBack: {
      backgroundColor: 'transparent',
      color: 'hsl(var(--muted-foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '6px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      marginRight: '8px',
      transition: 'all 0.2s',
    },
    buttonSkip: {
      backgroundColor: 'transparent',
      color: 'hsl(var(--muted-foreground))',
      border: 'none',
      padding: '8px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'color 0.2s',
    },
    spotlight: {
      borderRadius: '8px',
    },
  };

  const tourSteps = getTourSteps();

  return (
    <Joyride
      steps={tourSteps}
      run={isOpen}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      disableScrollParentFix
      spotlightClicks={false}

      styles={joyrideStyles}
      locale={{
        back: t('onboarding.buttons.back'),
        close: t('onboarding.buttons.close'),
        last: t('onboarding.buttons.finish'),
        next: t('onboarding.buttons.next'),
        skip: t('onboarding.buttons.skip'),
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.12))',
          },
        },
      }}
      tooltipComponent={({ tooltipProps, primaryProps, backProps, skipProps, isLastStep, step, index }) => (
        <div
          className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-sm"
          {...tooltipProps}
        >
          {step?.title && (
            <h3 className="text-lg font-semibold text-primary mb-2">
              {step.title}
            </h3>
          )}
          <div className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {step?.content}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {index > 0 && (
                <button
                  className="px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  {...backProps}
                >
                  {t('onboarding.buttons.back')}
                </button>
              )}
              <button
                className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                {...primaryProps}
              >
                {isLastStep ? t('onboarding.buttons.finish') : t('onboarding.buttons.next')}
              </button>
            </div>
            <button
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              {...skipProps}
            >
              {t('onboarding.buttons.skip')}
            </button>
          </div>
        </div>
      )}
    />
  );
};

export default OnboardingTour;