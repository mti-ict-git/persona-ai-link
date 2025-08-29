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
  createNewSession: (initialMessage?: string) => Promise<string>;
  selectSession: (sessionId: string) => void;
  updateSessionName: (sessionId: string, sessionName: string) => Promise<void>;
  renameSession: (sessionId: string, newName: string) => Promise<void>;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'session_id' | 'created_at'>) => Promise<Message>;
  getSessionMessages: (sessionId: string) => Promise<Message[]>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export function useSessionManager(): UseSessionManagerReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitiallySelected, setHasInitiallySelected] = useState(false);
  const { sendToN8N } = useN8NWebhook();

  // Get active session
  const activeSession = sessions.find(session => session.id === activeSessionId) || null;

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

  // Load sessions on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Mark as initially selected without auto-selecting any session (start with blank new session)
  useEffect(() => {
    if (!hasInitiallySelected && sessions.length > 0) {
      setHasInitiallySelected(true);
    }
  }, [sessions, hasInitiallySelected]); // Only auto-select once on initial load



  // Create new session with N8N integration
  const createNewSession = useCallback(async (initialMessage?: string): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newSession = await apiService.createSession();
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      
      // Add initial message if provided
      if (initialMessage) {
        await addMessage(newSession.id, {
          content: initialMessage,
          role: 'user',
          message_order: 1
        });
      }
      
      // Session created successfully - N8N integration will happen when messages are sent
      toast.success('New session created');
      
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
    // Convert empty string to null for "New Chat" state
    setActiveSessionId(sessionId === '' ? null : sessionId);
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

  // Helper function to get next message order for a session
  const getNextMessageOrder = useCallback(async (sessionId: string): Promise<number> => {
    try {
      const messages = await apiService.getMessages(sessionId);
      return messages.length + 1;
    } catch (err) {
      console.error('Failed to get message count:', err);
      return 1; // Default to 1 if we can't get the count
    }
  }, []);

  // Add message to session
  const addMessage = useCallback(async (
    sessionId: string, 
    message: Omit<Message, 'id' | 'session_id' | 'created_at'>
  ): Promise<Message> => {
    try {
      // Ensure message_order is set if not provided
      const messageWithOrder = {
        ...message,
        message_order: message.message_order || await getNextMessageOrder(sessionId)
      };
      
      const newMessage = await apiService.addMessage(sessionId, messageWithOrder);
      
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
  const getSessionMessages = useCallback(async (sessionId: string): Promise<Message[]> => {
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
      
      // Update sessions list first
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If we're deleting the active session, clear it
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      
      toast.success('Session deleted');
    } catch (err) {
      console.error('Failed to delete session:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete session';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [activeSessionId]);



  return {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    error,
    createNewSession,
    selectSession,
    updateSessionName,
    renameSession: updateSessionName, // Alias for better naming consistency
    addMessage,
    getSessionMessages,
    deleteSession,
    refreshSessions
  };
}