import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Shield, 
  Brain, 
  Mic, 
  Database,
  Users,
  LogOut
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import TrainingContent from '@/components/TrainingContent';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLanguage } from '@/contexts/LanguageContext';

type SettingsSection = 'general' | 'personalization' | 'speech' | 'data-controls' | 'builder-profile' | 'connected-apps' | 'security' | 'training';

interface SettingsSidebarItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { preferences, loading: prefsLoading, updatePreference } = useUserPreferences();
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [showFollowUpSuggestions, setShowFollowUpSuggestions] = useState(true);
  const [alwaysShowCode, setAlwaysShowCode] = useState(false);

  // Sync preferences with local state
  useEffect(() => {
    if (preferences.showFollowUpSuggestions !== undefined) {
      setShowFollowUpSuggestions(preferences.showFollowUpSuggestions?.value === 'true');
    }
    if (preferences.alwaysShowCode !== undefined) {
      setAlwaysShowCode(preferences.alwaysShowCode?.value === 'true');
    }
  }, [preferences]);

  const sidebarItems: SettingsSidebarItem[] = [
    { id: 'general', label: t('settings.general'), icon: SettingsIcon },
    { id: 'personalization', label: t('settings.personalization'), icon: User },
    { id: 'speech', label: t('settings.speech'), icon: Mic },
    { id: 'data-controls', label: t('settings.dataControls'), icon: Database },
    { id: 'builder-profile', label: t('settings.builderProfile'), icon: Users },
    { id: 'connected-apps', label: t('settings.connectedApps'), icon: SettingsIcon },
    { id: 'security', label: t('settings.security'), icon: Shield },
    { id: 'training', label: t('settings.training'), icon: Brain, adminOnly: true },
  ];

  const handleClose = () => {
    navigate('/');
  };



  const handleArchiveAllChats = () => {
    toast({
      title: t('settings.archiveAllChats'),
      description: t('settings.featureComingSoon'),
    });
  };

  const handleDeleteAllChats = () => {
    toast({
      title: t('settings.deleteAllChats'),
      description: t('settings.featureComingSoon'),
      variant: "destructive",
    });
  };

  // Preference handlers
  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await changeLanguage(newLanguage);
    } catch (error) {
      console.error('Failed to update language preference:', error);
    }
  };

  const handleShowCodeChange = async (checked: boolean) => {
    setAlwaysShowCode(checked);
    try {
      await updatePreference('alwaysShowCode', checked.toString());
    } catch (error) {
      console.error('Failed to update show code preference:', error);
    }
  };

  const handleFollowUpChange = async (checked: boolean) => {
    setShowFollowUpSuggestions(checked);
    try {
      await updatePreference('showFollowUpSuggestions', checked.toString());
    } catch (error) {
      console.error('Failed to update follow-up suggestions preference:', error);
    }
  };

  const handleThemeToggle = async () => {
    toggleTheme();
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      await updatePreference('theme', newTheme);
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.general')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme">{t('settings.theme')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.chooseTheme')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm capitalize">{theme}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleThemeToggle}
                      disabled={prefsLoading}
                    >
                      {theme === 'light' ? '🌙' : '☀️'}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="code-analyst">{t('settings.alwaysShowCode')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.displayCodeBlocks')}</p>
                  </div>
                  <Switch
                    id="code-analyst"
                    checked={alwaysShowCode}
                    onCheckedChange={handleShowCodeChange}
                    disabled={prefsLoading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="follow-up">{t('settings.followUpSuggestions')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.followUpSuggestions')}</p>
                  </div>
                  <Switch
                    id="follow-up"
                    checked={showFollowUpSuggestions}
                    onCheckedChange={handleFollowUpChange}
                    disabled={prefsLoading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="language">{t('settings.language')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.selectLanguage')}</p>
                  </div>
                  <Select value={currentLanguage} onValueChange={handleLanguageChange} disabled={prefsLoading}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('settings.english')}</SelectItem>
                      <SelectItem value="zh">{t('settings.chinese')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'personalization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.personalization')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('settings.customizeExperience')}
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assistant-name">{t('settings.assistantName')}</Label>
                  <Input 
                    id="assistant-name" 
                    value="Tsindeka AI" 
                    className="mt-1" 
                    disabled 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.assistantNameComingSoon')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'speech':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.speechSettings')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('settings.configureSpeech')}
              </p>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('settings.speechComingSoon')}
                </p>
              </div>
            </div>
          </div>
        );

      case 'data-controls':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.dataControls')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('settings.archivedChats')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.manageArchivedConversations')}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {t('common.manage')}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('settings.archiveAllChats')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.moveAllToArchive')}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleArchiveAllChats}
                  >
                    {t('settings.archiveAll')}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('settings.deleteAllChats')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.permanentlyDeleteAll')}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteAllChats}
                  >
                    {t('settings.deleteAll')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'builder-profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.builderProfile')}</h3>
              <p className="text-muted-foreground">{t('settings.manageAccountInfo')}</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.accountInformation')}</CardTitle>
                <CardDescription>{t('settings.updatePersonalDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={user?.email || ''} 
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">{t('settings.emailCannotChange')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('settings.role')}</Label>
                    <Input 
                      id="role" 
                      value={user?.role || ''} 
                      disabled
                      className="bg-muted capitalize"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display-name">{t('settings.displayName')}</Label>
                  <Input 
                    id="display-name" 
                    placeholder={t('settings.enterDisplayName')}
                    defaultValue={user?.email?.split('@')[0] || ''}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.displayNameDescription')}</p>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={() => toast({ title: t('settings.profileUpdated'), description: t('settings.profileUpdatedSuccess') })}>
                    {t('common.saveChanges')}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.accountStatistics')}</CardTitle>
                <CardDescription>{t('settings.accountActivity')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">0</div>
                    <div className="text-sm text-muted-foreground">{t('settings.chatSessions')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">0</div>
                    <div className="text-sm text-muted-foreground">{t('settings.messagesSent')}</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{user?.role === 'admin' ? t('settings.unlimited') : '0'}</div>
                    <div className="text-sm text-muted-foreground">{t('settings.trainingFiles')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'connected-apps':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.connectedApps')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('settings.manageIntegrations')}
              </p>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('settings.noConnectedApps')}
                </p>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">{t('settings.security')}</h3>
              <p className="text-muted-foreground">{t('settings.manageSecuritySettings')}</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.passwordAuthentication')}</CardTitle>
                <CardDescription>
                  {user?.authMethod === 'ldap' 
                    ? t('settings.ldapPasswordDescription')
                    : t('settings.updatePasswordDescription')
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.authMethod === 'ldap' ? (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{t('settings.ldapAccount')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.ldapAccountDescription')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="current-password">{t('settings.currentPassword')}</Label>
                      <Input 
                        id="current-password" 
                        type="password" 
                        placeholder={t('settings.currentPasswordPlaceholder')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">{t('settings.newPassword')}</Label>
                      <Input 
                        id="new-password" 
                        type="password" 
                        placeholder={t('settings.newPasswordPlaceholder')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t('settings.confirmNewPassword')}</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        placeholder={t('settings.confirmNewPasswordPlaceholder')}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button onClick={() => toast({ title: t('settings.passwordUpdated'), description: t('settings.passwordUpdatedSuccess') })}>
                        {t('settings.updatePassword')}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.sessionManagement')}</CardTitle>
                <CardDescription>{t('settings.manageActiveSessions')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('settings.autoLogout')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.autoLogoutDescription')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>{t('settings.activeSessions')}</Label>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t('settings.currentSession')}</p>
                        <p className="text-sm text-muted-foreground">{t('settings.sessionDetails')}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{t('settings.current')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      logout();
                      toast({ title: t('settings.loggedOut'), description: t('settings.loggedOutAllSessions') });
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('settings.logOutAllSessions')}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.privacySettings')}</CardTitle>
                <CardDescription>{t('settings.controlDataPrivacy')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-collection">{t('settings.dataCollection')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.dataCollectionDescription')}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analytics">{t('settings.analytics')}</Label>
                    <p className="text-sm text-muted-foreground">{t('settings.analyticsDescription')}</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'training':
        if (!isAdmin) {
          return (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('settings.accessRestricted')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings.needAdminPrivileges')}
                </p>
              </div>
            </div>
          );
        }
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {t('settings.aiTraining')}
              </CardTitle>
              <CardDescription>
                {t('settings.manageTrainingData')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrainingContent />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r bg-card">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <nav className="space-y-1">
              {sidebarItems.map((item) => {
                // Hide admin-only items for non-admin users
                if (item.adminOnly && !isAdmin) {
                  return null;
                }
                
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      activeSection === item.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;