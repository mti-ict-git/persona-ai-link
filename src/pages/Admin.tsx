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

type AdminSection = 'dashboard' | 'user-management' | 'training-management';

interface SidebarItem {
  id: AdminSection | 'back-to-chat';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
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
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'user-management', label: 'User Management', icon: Users, superAdminOnly: true },
    { id: 'training-management', label: 'Training Process', icon: Settings },
    { id: 'back-to-chat', label: 'Back to Chat', icon: ArrowLeft },
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
      const data = await apiService.get<{ users: User[] }>('/admin/users');
      setUsers(data.users || []);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users');
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiService.get<SystemStats>('/admin/stats');
      setStats(data);
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
      toast.success('User updated successfully');
      fetchUsers();
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      toast.error('Error updating user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await apiService.delete<{ message: string }>(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
      fetchStats();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user');
    }
  };

  const handleCreateUser = async () => {
    try {
      await apiService.post<{ message: string }>('/admin/users', newUser);
      toast.success('User created successfully');
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
        : 'Error creating user';
      toast.error(errorMessage);
    }
  };

  const handleResetPassword = async () => {
    try {
      await apiService.post<{ message: string }>(`/admin/users/${resetUserId}/reset-password`, {
        newPassword: resetPassword
      });
      toast.success('Password reset successfully');
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
        : 'Error resetting password';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
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
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage system users and their permissions (SuperAdmin only)
          </CardDescription>
        </CardHeader>
        <CardContent>
        <Table>
          <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Account Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
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
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResetPasswordDialog(user.id)}
                      title={user.authMethod === 'ldap' ? 'Cannot reset password for LDAP accounts' : 'Reset Password'}
                      disabled={user.authMethod === 'ldap'}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      title="Delete User"
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
        <h1 className="text-3xl font-bold">Training Process Management</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Training Management</CardTitle>
          <CardDescription>
            Manage AI training processes and model configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Training Management</h3>
            <p className="text-muted-foreground">
              Training management features will be implemented here.
              This section will include model training, configuration management, and process monitoring.
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
            <p className="text-muted-foreground">You don't have permission to access user management.</p>
          </div>
        );
      case 'training-management':
        return canManageTraining ? renderTrainingManagement() : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">You don't have permission to access training management.</p>
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
            {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
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
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
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
                  Email
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
                  Role
                </Label>
                <Select
                  value={editingUser.role || 'user'}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">SuperAdmin</SelectItem>
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
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="Enter password (min 8 characters)"
              />
            </div>
            <div>
              <Label htmlFor="create-role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setNewUser({ username: '', email: '', password: '', role: 'user' });
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for the selected user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => {
              setIsResetPasswordDialogOpen(false);
              setResetPassword('');
              setResetUserId(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;