import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Session, Message } from '../utils/database';
import { apiService, ApiError } from '../services/api';
import { useN8NWebhook } from './useN8NWebhook';
import { toast } from 'sonner';

interface SessionCreationResponse {
  success: boolean;
  session_id: string;
  session_name?: string;
  message?: string;
  metadata?: any;
  error?: string;
}

interface UseSessionManagerReturn {
  sessions: Session[];
  activeSession: Session | null;
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  createNewSession: () => Promise<string>;
  selectSession: (sessionId: string) => void;
  updateSessionName: (sessionId: string, sessionName: string) => Promise<void>;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'session_id' | 'created_at'>) => Promise<Message>;
  getSessionMessages: (sessionId: string) => Promise<Message[]>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export function useSessionManager(): UseSessionManagerReturn {
  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendToN8N } = useN8NWebhook();

  // Get active session
  const activeSession = sessions.find(session => session.id === activeSessionId) || null;

  // Load sessions on mount
  useEffect(() => {
    refreshSessions();
  }, []);

  // Refresh sessions from API
  const refreshSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const dbSessions = await apiService.getSessions();
      setSessions(dbSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load chat sessions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new session with N8N integration
  const createNewSession = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newSession = await apiService.createSession();
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      
      // Initialize session with N8N
      try {
        const response = await apiService.initializeSession(newSession.id);
        
        // Handle session name update from N8N response
        if (response?.session_name_update) {
          await updateSessionName(newSession.id, response.session_name_update);
        }
        
        // Handle initial AI message from N8N response
        if (response?.ai_message) {
          await addMessage(newSession.id, {
            content: response.ai_message.content,
            role: response.ai_message.role,
            message_type: 'text'
          });
        }
        
        toast.success('Session created and connected to AI assistant');
      } catch (webhookError) {
        console.warn('N8N webhook failed during session creation:', webhookError);
        toast.warning('Session created but AI assistant connection failed');
      }
      
      return newSession.id;
    } catch (err) {
      console.error('Failed to create session:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create new session';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Select a session
  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  // Update session name
  const updateSessionName = useCallback(async (sessionId: string, sessionName: string): Promise<void> => {
    try {
      await apiService.updateSession(sessionId, { session_name: sessionName });
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, session_name: sessionName }
          : session
      ));
      toast.success('Session name updated');
    } catch (err) {
      console.error('Failed to update session name:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update session name';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Add message to session
  const addMessage = useCallback(async (
    sessionId: string, 
    message: Omit<DBMessage, 'id' | 'session_id' | 'created_at'>
  ): Promise<DBMessage> => {
    try {
      const newMessage = await apiService.addMessage(sessionId, message);
      
      // Update session's updated_at timestamp in local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, updated_at: new Date() }
          : session
      ));
      
      return newMessage;
    } catch (err) {
      console.error('Failed to add message:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to save message';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Get session messages
  const getSessionMessages = useCallback(async (sessionId: string): Promise<DBMessage[]> => {
    try {
      return await apiService.getMessages(sessionId);
    } catch (err) {
      console.error('Failed to get session messages:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load messages';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    }
  }, []);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await apiService.deleteSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If we're deleting the active session, switch to another one
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter(session => session.id !== sessionId);
        setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
      }
      
      toast.success('Session deleted');
    } catch (err) {
      console.error('Failed to delete session:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete session';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [activeSessionId, sessions]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    error,
    createNewSession,
    selectSession,
    updateSessionName,
    addMessage,
    getSessionMessages,
    deleteSession,
    refreshSessions
  };
}