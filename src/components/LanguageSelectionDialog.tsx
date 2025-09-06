import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectionDialogProps {
  open: boolean;
  onLanguageSelect: (language: string) => void;
}

const LanguageSelectionDialog: React.FC<LanguageSelectionDialogProps> = ({
  open,
  onLanguageSelect,
}) => {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = React.useState<string>('en');

  const languages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
    },
    {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      flag: '🇨🇳',
    },
  ];

  const handleConfirm = () => {
    onLanguageSelect(selectedLanguage);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {t('languageSelection.welcomeChooseLanguage')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('languageSelection.selectPreferredLanguage')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {languages.map((language) => (
            <Card
              key={language.code}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedLanguage === language.code
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedLanguage(language.code)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{language.flag}</span>
                  <div>
                    <div className="font-medium">{language.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {language.nativeName}
                    </div>
                  </div>
                </div>
                {selectedLanguage === language.code && (
                  <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button onClick={handleConfirm} className="w-full">
            {t('languageSelection.continue')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LanguageSelectionDialog;