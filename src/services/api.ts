import { Message, Session } from '../utils/database';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new ApiError(response.status, errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Session Management
  async getSessions(): Promise<Session[]> {
    return this.request<Session[]>('/sessions');
  }

  async createSession(): Promise<Session> {
    return this.request<Session>('/sessions', {
      method: 'POST',
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}`);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Message Management
  async getMessages(sessionId: string): Promise<Message[]> {
    return this.request<Message[]>(`/messages/session/${sessionId}`);
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'session_id' | 'created_at'>): Promise<Message> {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        ...message,
      }),
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    return this.request<void>(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async addMessages(messages: Omit<Message, 'id' | 'created_at'>[]): Promise<Message[]> {
    return this.request<Message[]>('/messages/batch', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  }

  // Webhook Management
  async sendToN8N(payload: {
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
  }> {
    return this.request('/webhooks/send-to-n8n', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async testWebhook(webhookUrl: string): Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }> {
    return this.request('/webhooks/test', {
      method: 'POST',
      body: JSON.stringify({ webhook_url: webhookUrl }),
    });
  }

  async initializeSession(sessionId: string): Promise<{
    success: boolean;
    session_name_update?: string;
    ai_message?: {
      content: string;
      role: string;
    };
  }> {
    return this.request('/webhooks/session-init', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }
}

export const apiService = new ApiService();
export { ApiError };