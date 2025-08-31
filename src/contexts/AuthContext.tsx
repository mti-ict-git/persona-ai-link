import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, authMethod?: 'local' | 'ldap') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isAuthenticated = !!user && apiService.isAuthenticated();

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const response = await apiService.validateSession();
          if (response.valid) {
            setUser(response.user);
          } else {
            // Token is invalid, clear it
            await apiService.logout();
          }
        } catch (error) {
          // Session validation failed, clear token
          await apiService.logout();
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string, authMethod: 'local' | 'ldap' = 'local') => {
    const response = await apiService.login(email, password, authMethod);
    setUser(response.user);
    
    toast({
      title: "Login Successful",
      description: `Welcome back, ${response.user.firstName || response.user.username}!`,
    });
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      // Even if logout fails on server, clear local state
      setUser(null);
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      setUser(response.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, user might need to re-authenticate
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};