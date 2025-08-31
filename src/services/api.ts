import { Message, Session } from '../utils/database';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Authentication types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface AuthValidationResponse {
  valid: boolean;
  user: User;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private getAuthToken(): string | null {
    const token = localStorage.getItem('authToken');
    return token;
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  private removeAuthToken(): void {
    localStorage.removeItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // Only set Content-Type if not already specified (important for FormData)
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      headers,
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

  // Authentication
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store the token
    this.setAuthToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      // Always remove token, even if request fails
      this.removeAuthToken();
    }
  }

  async validateSession(): Promise<AuthValidationResponse> {
    return await this.request<AuthValidationResponse>('/auth/validate');
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return await this.request<{ user: User }>('/auth/profile');
  }

  isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  // Session Management
  async getSessions(): Promise<Session[]> {
    const response = await this.request<{success: boolean, data: Session[], count: number}>('/sessions');
    return response.data;
  }

  async createSession(): Promise<Session> {
    const response = await this.request<{success: boolean, data: Session}>('/sessions', {
      method: 'POST',
    });
    return response.data;
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await this.request<{success: boolean, data: Session}>(`/sessions/${sessionId}`);
    return response.data;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    const response = await this.request<{success: boolean, data: Session}>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Message Management
  async getMessages(sessionId: string): Promise<Message[]> {
    const response = await this.request<{success: boolean, data: Message[], count: number, session_id: string}>(`/messages/session/${sessionId}`);
    return response.data;
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'session_id' | 'created_at'>): Promise<Message> {
    const response = await this.request<{success: boolean, data: Message}>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        ...message,
      }),
    });
    return response.data;
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
    data?: {
      message?: string;
      session_name_update?: string;
      raw_response?: unknown;
    };
    response?: unknown;
    session_name_update?: string;
    ai_message?: {
      content: string;
      role: string;
    };
    metadata?: unknown;
  }> {
    return this.request('/webhooks/send-to-n8n', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async testWebhook(): Promise<{
    success: boolean;
    response?: unknown;
    error?: string;
  }> {
    return this.request('/webhooks/test', {
      method: 'POST',
    });
  }

  // Generic HTTP methods for file operations
  async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
    const headers: Record<string, string> = {
      ...options?.headers,
    };

    // Don't set Content-Type for FormData, let the browser set it with boundary
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    // For FormData, explicitly avoid setting Content-Type
    else {
      delete headers['Content-Type'];
    }

    return this.request(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers,
    });
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<T> {
    const headers: Record<string, string> = {
      ...options?.headers,
    };

    // Don't set Content-Type for FormData, let the browser set it with boundary
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    // For FormData, explicitly avoid setting Content-Type
    else {
      delete headers['Content-Type'];
    }

    return this.request(endpoint, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers,
    });
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Message feedback methods
  async submitMessageFeedback(feedback: {
    messageId: string;
    sessionId: string;
    feedbackType: 'positive' | 'negative';
    comment: string;
    messageContent: string;
    timestamp: string;
  }): Promise<{ success: boolean; id?: string }> {
    return this.request('/feedback/message', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  async getFeedbackData(filters?: {
    startDate?: string;
    endDate?: string;
    feedbackType?: 'positive' | 'negative';
    sessionId?: string;
  }): Promise<unknown[]> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.feedbackType) queryParams.append('feedbackType', filters.feedbackType);
    if (filters?.sessionId) queryParams.append('sessionId', filters.sessionId);
    
    const endpoint = `/feedback/export${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async downloadFeedbackCSV(filters?: {
    startDate?: string;
    endDate?: string;
    feedbackType?: 'positive' | 'negative';
    sessionId?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.feedbackType) queryParams.append('feedbackType', filters.feedbackType);
    if (filters?.sessionId) queryParams.append('sessionId', filters.sessionId);
    
    const endpoint = `/feedback/export/csv${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download feedback CSV');
    }
    
    return response.blob();
  }

}

export const apiService = new ApiService();
export { ApiError };