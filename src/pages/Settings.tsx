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

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

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
                  <div className="flex items-center gap-2">
                    <span className="text-sm capitalize">{theme}</span>
                    <ThemeToggle />
                  </div>
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
              <p className="text-muted-foreground">Manage your account information and preferences.</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Update your personal details and account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={user?.email || ''} 
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input 
                      id="role" 
                      value={user?.role || ''} 
                      disabled
                      className="bg-muted capitalize"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input 
                    id="display-name" 
                    placeholder="Enter your display name"
                    defaultValue={user?.email?.split('@')[0] || ''}
                  />
                  <p className="text-xs text-muted-foreground">This is how your name will appear in the application</p>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={() => toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' })}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
                <CardDescription>Your account activity and usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">0</div>
                    <div className="text-sm text-muted-foreground">Chat Sessions</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">0</div>
                    <div className="text-sm text-muted-foreground">Messages Sent</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{user?.role === 'admin' ? 'Unlimited' : '0'}</div>
                    <div className="text-sm text-muted-foreground">Training Files</div>
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
              <p className="text-muted-foreground">Manage your security settings and privacy.</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Password & Authentication</CardTitle>
                <CardDescription>Update your password and authentication settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    placeholder="Enter your current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    placeholder="Enter your new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    placeholder="Confirm your new password"
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={() => toast({ title: 'Password updated', description: 'Your password has been updated successfully.' })}>
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>Manage your active sessions and login security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-logout after inactivity</Label>
                    <p className="text-sm text-muted-foreground">Automatically log out after a period of inactivity</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>Active Sessions</Label>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Windows • Chrome • Active now</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Current</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      logout();
                      toast({ title: 'Logged out', description: 'You have been logged out of all sessions.' });
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out All Sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your data and privacy preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Collection</Label>
                    <p className="text-sm text-muted-foreground">Allow collection of usage data to improve the service</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">Share anonymous analytics to help improve the platform</p>
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
                <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
                <p className="text-sm text-muted-foreground">
                  You need administrator or super administrator privileges to access the training section.
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
                AI Training
              </CardTitle>
              <CardDescription>
                Manage AI training data and model configuration (Admin/Super Admin Only)
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