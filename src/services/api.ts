import { Message, Session } from '../utils/database';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Authentication types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  authMethod?: 'local' | 'ldap';
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

// User preferences types
export interface UserPreferences {
  language?: {
    value: string;
    updatedAt: string;
  };
  theme?: {
    value: string;
    updatedAt: string;
  };
  timezone?: {
    value: string;
    updatedAt: string;
  };
  showFollowUpSuggestions?: {
    value: string;
    updatedAt: string;
  };
  alwaysShowCode?: {
    value: string;
    updatedAt: string;
  };
  firstTimeLogin?: {
    value: string;
    updatedAt: string;
  };
  [key: string]: {
    value: string;
    updatedAt: string;
  } | undefined;
}

export interface PreferenceUpdateRequest {
  key: string;
  value: string;
}

export interface BulkPreferenceUpdateRequest {
  preferences: PreferenceUpdateRequest[];
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

    // Only set Content-Type for non-FormData requests
    // For FormData, let the browser set Content-Type with boundary
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new ApiError(response.status, errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Authentication
  async login(email: string, password: string, authMethod: 'local' | 'ldap' = 'local'): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, authMethod }),
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
  async get<T = unknown>(endpoint: string): Promise<{success: boolean, data: T}> {
    const data = await this.request<T>(endpoint, {
      method: 'GET',
    });
    return { success: true, data };
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<{success: boolean, data: T}> {
    const requestOptions: RequestInit = {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    };

    // Only add headers if we need to override defaults or add custom headers
    if (options?.headers || !(data instanceof FormData)) {
      const headers: Record<string, string> = {
        ...options?.headers,
      };

      // Don't set Content-Type for FormData, let the browser set it with boundary
      if (!(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      requestOptions.headers = headers;
    }

    const responseData = await this.request<T>(endpoint, requestOptions);
    return { success: true, data: responseData };
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string> }): Promise<{success: boolean, data: T}> {
    const requestOptions: RequestInit = {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    };

    // Only add headers if we need to override defaults or add custom headers
    if (options?.headers || !(data instanceof FormData)) {
      const headers: Record<string, string> = {
        ...options?.headers,
      };

      // Don't set Content-Type for FormData, let the browser set it with boundary
      if (!(data instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      requestOptions.headers = headers;
    }

    return this.request(endpoint, requestOptions);
  }

  async delete<T = unknown>(endpoint: string): Promise<{success: boolean, data?: T}> {
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
    previousQuestion: string;
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

  // User Preferences Methods
  async getUserPreferences(): Promise<UserPreferences> {
    const response = await this.request<{success: boolean, preferences: UserPreferences}>('/preferences', {
      method: 'GET'
    });
    return response.preferences;
  }

  async getUserPreference(key: string): Promise<{ key: string; value: string }> {
    const response = await this.request<{ key: string; value: string }>(`/preferences/${key}`, {
      method: 'GET'
    });
    return response;
  }

  async updateUserPreference(key: string, value: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(`/preferences/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value })
    });
    return response;
  }

  async updateUserPreferencesBulk(preferences: PreferenceUpdateRequest[]): Promise<{ success: boolean; message: string; updated: number }> {
    const response = await this.request<{ success: boolean; message: string; updated: number }>('/preferences/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ preferences })
    });
    return response;
  }

  async deleteUserPreference(key: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<{ success: boolean; message: string }>(`/preferences/${key}`, {
      method: 'DELETE'
    });
    return response;
  }

}

export const apiService = new ApiService();
export { ApiError };