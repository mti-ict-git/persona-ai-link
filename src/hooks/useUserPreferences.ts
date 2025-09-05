import { useState, useEffect } from 'react';
import { apiService, UserPreferences } from '@/services/api';
import { toast } from '@/hooks/use-toast';

export interface UserPreferencesHook {
  preferences: UserPreferences;
  loading: boolean;
  error: string | null;
  updatePreference: (key: string, value: string) => Promise<void>;
  updatePreferences: (updates: Record<string, string>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

export const useUserPreferences = (): UserPreferencesHook => {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const userPrefs = await apiService.getUserPreferences();
      setPreferences(userPrefs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preferences';
      setError(errorMessage);
      console.error('Error loading user preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: string) => {
    try {
      await apiService.updateUserPreference(key, value);
      setPreferences(prev => ({ ...prev, [key]: value }));
      toast({
        title: 'Preference Updated',
        description: `${key} has been updated successfully.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preference';
      setError(errorMessage);
      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updatePreferences = async (updates: Record<string, string>) => {
    try {
      const preferences = Object.entries(updates).map(([key, value]) => ({ key, value }));
      await apiService.updateUserPreferencesBulk(preferences);
      setPreferences(prev => ({ ...prev, ...updates }));
      toast({
        title: 'Preferences Updated',
        description: `${preferences.length} preferences updated successfully.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      toast({
        title: 'Update Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const refreshPreferences = async () => {
    await loadPreferences();
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  return {
    preferences,
    loading,
    error,
    updatePreference,
    updatePreferences,
    refreshPreferences,
  };
};