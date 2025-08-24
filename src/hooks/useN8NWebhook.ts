import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiService, ApiError } from '../services/api';

interface WebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
  session_name_update?: string;
}

interface N8NWebhookConfig {
  webhookUrl: string;
  sessionId: string;
  onSessionNameUpdate?: (sessionId: string, sessionName: string) => void;
}

export const useN8NWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendToN8N = useCallback(async (payload: {
    event_type: string;
    session_id: string;
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
    response?: any;
    session_name_update?: string;
    ai_message?: {
      content: string;
      role: string;
    };
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Sending to N8N via API:', payload);
      
      const result = await apiService.sendToN8N(payload);
      
      console.log('N8N Response via API:', result);
      
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

  const testWebhook = useCallback(async (webhookUrl: string): Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Testing webhook via API:', webhookUrl);
      
      const result = await apiService.testWebhook(webhookUrl);
      
      console.log('Webhook test response via API:', result);
      
      if (result.success) {
        toast.success('Webhook connection successful!');
      } else {
        toast.error(`Webhook test failed: ${result.error}`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Unknown error occurred';
      console.error('Webhook test error:', errorMessage);
      setError(errorMessage);
      toast.error(`Webhook test failed: ${errorMessage}`);
      
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