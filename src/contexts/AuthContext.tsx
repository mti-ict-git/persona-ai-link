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

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log('[AUTH CONTEXT] Checking authentication status on app load');
      console.log('[AUTH CONTEXT] Current URL:', window.location.href);
      console.log('[AUTH CONTEXT] Cookies:', document.cookie);
      console.log('[AUTH CONTEXT] LocalStorage token:', localStorage.getItem('token') ? 'present' : 'missing');
      
      // Check for any form of authentication (localStorage token or cookie)
      const isAuth = await apiService.isAuthenticated();
      console.log('[AUTH CONTEXT] API service authenticated:', isAuth);
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        console.log('[AUTH CONTEXT] User appears authenticated, validating session...');
        try {
          const response = await apiService.validateSession();
          console.log('[AUTH CONTEXT] Session validation response received');
          
          if (response.valid) {
            console.log('[AUTH CONTEXT] Session valid, user authenticated');
            setUser(response.user);
            setIsAuthenticated(true);
          } else {
            console.log('[AUTH CONTEXT] Session invalid, clearing authentication');
            // Token is invalid, clear it
            setIsAuthenticated(false);
            await apiService.logout();
          }
        } catch (error) {
          console.error('[AUTH CONTEXT] Session validation failed:', error);
          // Session validation failed, clear token
          setIsAuthenticated(false);
          await apiService.logout();
        }
      } else {
        console.log('[AUTH CONTEXT] User not authenticated');
      }
      
      console.log('[AUTH CONTEXT] Authentication check complete, setting loading to false');
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string, authMethod: 'local' | 'ldap' = 'local') => {
    console.log('[AUTH CONTEXT] Login attempt started');
    console.log('[AUTH CONTEXT] Attempting login with provided credentials');
    console.log('[AUTH CONTEXT] Auth method:', authMethod);
    
    try {
      const response = await apiService.login(email, password, authMethod);
      console.log('[AUTH CONTEXT] Login response received');
      
      setUser(response.user);
      setIsAuthenticated(true);
      console.log('[AUTH CONTEXT] User authenticated and context updated');
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${response.user.firstName || response.user.username}!`,
      });
      
      console.log('[AUTH CONTEXT] Login completed successfully');
    } catch (error) {
      console.error('[AUTH CONTEXT] Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('[AUTH CONTEXT] Logout initiated');
    console.log('[AUTH CONTEXT] Initiating logout process');
    
    try {
      await apiService.logout();
      console.log('[AUTH CONTEXT] API logout successful');
      
      setUser(null);
      setIsAuthenticated(false);
      console.log('[AUTH CONTEXT] User cleared from context');
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      
      console.log('[AUTH CONTEXT] Logout completed successfully');
    } catch (error) {
      console.error('[AUTH CONTEXT] Logout API call failed:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
      setIsAuthenticated(false);
      console.log('[AUTH CONTEXT] User cleared from context despite API error');
    }
  };

  const refreshUser = async () => {
    console.log('[AUTH CONTEXT] Refreshing user data');
    console.log('[AUTH CONTEXT] Initiating user data refresh');
    
    try {
      const response = await apiService.getCurrentUser();
      console.log('[AUTH CONTEXT] User refresh response received');
      
      setUser(response.user);
      setIsAuthenticated(true);
      console.log('[AUTH CONTEXT] User data refreshed successfully');
    } catch (error) {
      console.error('[AUTH CONTEXT] Failed to refresh user:', error);
      console.log('[AUTH CONTEXT] Initiating logout due to refresh failure');
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