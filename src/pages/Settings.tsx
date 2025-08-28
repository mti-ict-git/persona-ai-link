import React, { useState } from 'react';
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

// Import Training component content
import TrainingContent from '@/components/TrainingContent';

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
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [showFollowUpSuggestions, setShowFollowUpSuggestions] = useState(true);
  const [alwaysShowCode, setAlwaysShowCode] = useState(false);
  const [language, setLanguage] = useState('English (US)');

  const sidebarItems: SettingsSidebarItem[] = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'personalization', label: 'Personalization', icon: User },
    { id: 'speech', label: 'Speech', icon: Mic },
    { id: 'data-controls', label: 'Data controls', icon: Database },
    { id: 'builder-profile', label: 'Builder profile', icon: Users },
    { id: 'connected-apps', label: 'Connected apps', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'training', label: 'Training', icon: Brain, adminOnly: true },
  ];

  const handleClose = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveAllChats = () => {
    toast({
      title: "Archive All Chats",
      description: "This feature will be implemented soon.",
    });
  };

  const handleDeleteAllChats = () => {
    toast({
      title: "Delete All Chats",
      description: "This feature will be implemented soon.",
      variant: "destructive",
    });
  };

  const isAdmin = user?.role === 'admin';

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">General Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <Select value={theme} onValueChange={toggleTheme}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="code-analyst">Always show code when using data analyst</Label>
                    <p className="text-sm text-muted-foreground">Display code blocks by default in data analysis</p>
                  </div>
                  <Switch
                    id="code-analyst"
                    checked={alwaysShowCode}
                    onCheckedChange={setAlwaysShowCode}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="follow-up">Show follow up suggestions in chats</Label>
                    <p className="text-sm text-muted-foreground">Display suggested follow-up questions</p>
                  </div>
                  <Switch
                    id="follow-up"
                    checked={showFollowUpSuggestions}
                    onCheckedChange={setShowFollowUpSuggestions}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred language</p>
                  </div>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English (US)">English (US)</SelectItem>
                      <SelectItem value="English (UK)">English (UK)</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Indonesian">Indonesian</SelectItem>
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
              <h3 className="text-lg font-medium mb-4">Personalization</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your AI assistant experience
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assistant-name">Assistant Name</Label>
                  <Input 
                    id="assistant-name" 
                    value="Tsindeka AI" 
                    className="mt-1" 
                    disabled 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Assistant name customization coming soon
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
              <h3 className="text-lg font-medium mb-4">Speech Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure voice and speech recognition settings
              </p>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Speech features will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        );

      case 'data-controls':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Data Controls</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Archived chats</Label>
                    <p className="text-sm text-muted-foreground">Manage your archived conversations</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Archive all chats</Label>
                    <p className="text-sm text-muted-foreground">Move all conversations to archive</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleArchiveAllChats}
                  >
                    Archive all
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Delete all Chats</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete all conversations</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteAllChats}
                  >
                    Delete all
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
              <h3 className="text-lg font-medium mb-4">Builder Profile</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage your developer profile and preferences
              </p>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Builder profile features will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        );

      case 'connected-apps':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Connected Apps</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Manage integrations with external applications
              </p>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No connected apps available at this time.
                </p>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Security</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Log out on this device</Label>
                    <p className="text-sm text-muted-foreground">Sign out of your current session</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="text-destructive hover:text-destructive"
                  >
                    Log out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'training':
        if (!isAdmin) {
          return (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
                <p className="text-sm text-muted-foreground">
                  You need administrator privileges to access the training section.
                </p>
              </div>
            </div>
          );
        }
        return <TrainingContent />;

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
              <h2 className="text-lg font-semibold">Settings</h2>
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