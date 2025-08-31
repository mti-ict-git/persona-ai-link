import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiService, ApiError } from '../services/api';

interface WebhookResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  session_name_update?: string;
}

export const useN8NWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendToN8N = useCallback(async (payload: {
    event_type: string;
    sessionId: string;
    message_id?: string;
    message?: {
      content: string;
      role: string;
      timestamp: string;
    };
    context?: {
      session_history: Array<{
        content: string;
        role: string;
        timestamp: string;
      }>;
      session_name?: string;
    };
  }): Promise<{
    success: boolean;
    response?: unknown;
    session_name_update?: string;
    ai_message?: {
      content: string;
      role: string;
    };
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.sendToN8N(payload);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Unknown error occurred';
      console.error('N8N webhook error:', errorMessage);
      setError(errorMessage);
      
      return {
        success: false,
        response: { error: errorMessage }
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testWebhook = useCallback(async (): Promise<{
    success: boolean;
    response?: unknown;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.testWebhook();
      
      if (result.success) {
        toast.success('N8N server connection successful!');
      } else {
        toast.error(`N8N server test failed: ${result.error}`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Unknown error occurred';
      console.error('N8N server test error:', errorMessage);
      setError(errorMessage);
      toast.error(`N8N server test failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendToN8N,
    testWebhook,
    isLoading,
    error
  };
};