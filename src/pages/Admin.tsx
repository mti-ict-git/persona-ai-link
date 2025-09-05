import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Users, MessageSquare, BarChart3, Upload, FileText, ArrowLeft, Settings, UserPlus, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  authMethod?: 'local' | 'ldap';
}

interface SystemStats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  activeUsers: number;
}

type AdminSection = 'dashboard' | 'user-management' | 'feedback-export' | 'training-management';

interface SidebarItem {
  id: AdminSection | 'back-to-chat';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [resetPassword, setResetPassword] = useState('');
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  
  // Check if current user has permissions
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;
  const canManageUsers = isSuperAdmin;
  const canManageTraining = isAdmin;

  // Sidebar navigation items
  const sidebarItems: SidebarItem[] = [
    { id: 'dashboard', label: t('admin.dashboard'), icon: BarChart3 },
    { id: 'user-management', label: t('admin.userManagement'), icon: Users, superAdminOnly: true },
    { id: 'feedback-export', label: t('admin.feedbackExport'), icon: FileText },
    { id: 'training-management', label: t('admin.trainingProcess'), icon: Settings },
    { id: 'back-to-chat', label: t('admin.backToChat'), icon: ArrowLeft },
  ];

  useEffect(() => {
    if (canManageUsers && activeSection === 'user-management') {
      fetchUsers();
    }
    if (activeSection === 'dashboard') {
      fetchStats();
    }
  }, [canManageUsers, activeSection]);

  const fetchUsers = async () => {
    if (!canManageUsers) return;
    
    try {
      const response = await apiService.get<{ users: User[] }>('/admin/users');
      setUsers(response.data.users || []);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.get<SystemStats>('/admin/stats');
      setStats(response.data);
    } catch (error: unknown) {
      console.error('Error fetching statistics:', error);
      toast.error('Error fetching statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await apiService.put<{ message: string }>(`/admin/users/${userId}`, updates);
      toast.success(t('admin.userUpdatedSuccessfully'));
      fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      toast.error(t('admin.errorUpdatingUser'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('admin.confirmDeleteUser'))) {
      return;
    }

    try {
      await apiService.delete<{ message: string }>(`/admin/users/${userId}`);
      toast.success(t('admin.userDeletedSuccessfully'));
      fetchUsers();
      fetchStats();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      toast.error(t('admin.errorDeletingUser'));
    }
  };

  const handleCreateUser = async () => {
    try {
      await apiService.post<{ message: string }>('/admin/users', newUser);
      toast.success(t('admin.userCreatedSuccessfully'));
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      setIsCreateDialogOpen(false);
      fetchUsers();
      fetchStats();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && 
        typeof error.response.data === 'object' && error.response.data !== null &&
        'error' in error.response.data
        ? String(error.response.data.error)
        : t('admin.errorCreatingUser');
      toast.error(errorMessage);
    }
  };

  const handleResetPassword = async () => {
    try {
      await apiService.post<{ message: string }>(`/admin/users/${resetUserId}/reset-password`, {
        newPassword: resetPassword
      });
      toast.success(t('admin.passwordResetSuccessfully'));
      setResetPassword('');
      setResetUserId(null);
      setIsResetPasswordDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && 
        typeof error.response.data === 'object' && error.response.data !== null &&
        'error' in error.response.data
        ? String(error.response.data.error)
        : t('admin.errorResettingPassword');
      toast.error(errorMessage);
    }
  };

  const openResetPasswordDialog = (userId: string) => {
    setResetUserId(userId);
    setResetPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  const handleSidebarClick = (itemId: string) => {
    if (itemId === 'back-to-chat') {
      navigate('/');
    } else {
      setActiveSection(itemId as AdminSection);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser({ ...user });
    setIsEditDialogOpen(true);
  };

  const handleExportFeedback = async () => {
    try {
      const blob = await apiService.downloadFeedbackCSV();
      
      // Create blob link to download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      link.setAttribute('download', `feedback-export-${dateStr}.csv`);
      
      // Append to html link element page
      document.body.appendChild(link);
      
      // Start download
      link.click();
      
      // Clean up and remove the link
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Feedback data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export feedback data');
    }
  };

  const renderFeedbackExport = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.feedbackExport')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.exportFeedbackData')}</CardTitle>
          <CardDescription>
            {t('admin.exportFeedbackDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-medium">{t('admin.csvExport')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('admin.csvExportDescription')}
                </p>
              </div>
            </div>
            <Button onClick={handleExportFeedback} className="w-full sm:w-auto">
              <FileText className="h-4 w-4 mr-2" />
              {t('admin.downloadFeedbackCSV')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('admin.loadingAdminPanel')}</div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.adminDashboard')}</h1>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalSessions')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalMessages')}</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.activeUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.userManagement')}</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('admin.createUser')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.userManagement')}</CardTitle>
          <CardDescription>
            {t('admin.userManagement')}
          </CardDescription>
        </CardHeader>
        <CardContent>
        <Table>
          <TableHeader>
          <TableRow>
            <TableHead>{t('common.username')}</TableHead>
            <TableHead>{t('common.email')}</TableHead>
            <TableHead>{t('common.role')}</TableHead>
            <TableHead>{t('common.type')}</TableHead>
            <TableHead>{t('common.date')}</TableHead>
            <TableHead>{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={
                    user.role === 'superadmin' ? 'destructive' : 
                    user.role === 'admin' ? 'default' : 
                    'secondary'
                  }>
                    {user.role || 'user'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.authMethod === 'ldap' ? 'outline' : 'secondary'}>
                    {user.authMethod === 'ldap' ? 'LDAP' : 'Local'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      title={t('common.edit')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResetPasswordDialog(user.id)}
                      title={user.authMethod === 'ldap' ? t('admin.cannotResetLdapPassword') : t('admin.resetPassword')}
                      disabled={user.authMethod === 'ldap'}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );

  const renderTrainingManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('admin.trainingProcessManagement')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.trainingManagement')}</CardTitle>
          <CardDescription>
            {t('admin.trainingManagementDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Training Management</h3>
            <p className="text-muted-foreground">
              {t('admin.trainingManagementPlaceholder')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'user-management':
        return canManageUsers ? renderUserManagement() : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('admin.noPermissionUserManagement')}</p>
          </div>
        );
      case 'feedback-export':
        return isAdmin ? renderFeedbackExport() : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('admin.noPermissionFeedbackExport')}</p>
          </div>
        );
      case 'training-management':
        return canManageTraining ? renderTrainingManagement() : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('admin.noPermissionTrainingManagement')}</p>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">
            {isSuperAdmin ? t('admin.superAdminPanel') : t('admin.adminPanel')}
          </h2>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              // Hide superadmin-only items for non-superadmins
              if (item.superAdminOnly && !isSuperAdmin) {
                return null;
              }
              
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleSidebarClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {renderContent()}
        </div>
      </div>



      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.editUser')}</DialogTitle>
            <DialogDescription>
              {t('admin.editUserDescription')}
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  {t('common.username')}
                </Label>
                <Input
                  id="username"
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  {t('common.email')}
                </Label>
                <Input
                  id="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  {t('common.role')}
                </Label>
                <Select
                  value={editingUser.role || 'user'}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('common.user')}</SelectItem>
                    <SelectItem value="admin">{t('common.admin')}</SelectItem>
                    <SelectItem value="superadmin">{t('common.superadmin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              onClick={() =>
                editingUser && handleUpdateUser(editingUser.id, editingUser)
              }
            >
              {t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.createNewUser')}</DialogTitle>
            <DialogDescription>
              {t('admin.createNewUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-username">{t('common.username')}</Label>
              <Input
                id="create-username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                placeholder={t('auth.username')}
              />
            </div>
            <div>
              <Label htmlFor="create-email">{t('common.email')}</Label>
              <Input
                id="create-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder={t('common.email')}
              />
            </div>
            <div>
              <Label htmlFor="create-password">{t('common.password')}</Label>
              <Input
                id="create-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder={t('admin.enterPasswordPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="create-role">{t('common.role')}</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t('common.user')}</SelectItem>
                  <SelectItem value="admin">{t('common.admin')}</SelectItem>
                  <SelectItem value="superadmin">{t('common.superadmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setNewUser({ username: '', email: '', password: '', role: 'user' });
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateUser}>
              {t('admin.createUser')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.resetUserPassword')}</DialogTitle>
            <DialogDescription>
              {t('admin.resetPasswordDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-password">{t('settings.newPassword')}</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder={t('admin.enterPasswordPlaceholder')}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => {
              setIsResetPasswordDialogOpen(false);
              setResetPassword('');
              setResetUserId(null);
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetPassword}>
              {t('admin.resetPassword')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;