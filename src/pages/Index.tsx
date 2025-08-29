import { useState, useEffect } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMain from "@/components/ChatMain";
import SuggestionsPanel from "@/components/SuggestionsPanel";
// import WebhookConfig from "@/components/WebhookConfig"; // Hidden - N8N configured via env vars
import { useSessionManager } from "@/hooks/useSessionManager";
import { apiService } from "@/services/api";
import { Message as DatabaseMessage } from "@/utils/database";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  session_name?: string;
  timestamp: string;
  messages: Message[];
}

const Index = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  // const [isConfigOpen, setIsConfigOpen] = useState(false); // Removed - WebhookConfig hidden
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    sessions: dbSessions,
    activeSession,
    activeSessionId,
    createNewSession,
    selectSession,
    updateSessionName,
    renameSession,
    addMessage,
    getSessionMessages,
    deleteSession,
    isLoading: sessionLoading
  } = useSessionManager();



  // Convert database sessions to UI format
  useEffect(() => {
    const uiSessions: ChatSession[] = dbSessions.map(session => ({
      id: session.id,
      title: session.session_name || session.title,
      session_name: session.session_name,
      timestamp: new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [] // Messages loaded separately
    }));
    setSessions(uiSessions);
  }, [dbSessions]);

  // Load messages for active session
  useEffect(() => {
    if (activeSessionId) {
      // Only load messages if we don't already have messages (to preserve optimistic UI)
      if (currentMessages.length === 0) {
        loadSessionMessages(activeSessionId);
      }
    } else {
      setCurrentMessages([]);
    }
  }, [activeSessionId]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      console.log(`Loading messages for session: ${sessionId}`);
      const dbMessages = await getSessionMessages(sessionId);
      console.log(`Loaded ${dbMessages.length} messages from database:`, dbMessages.map(m => ({ id: m.id, content: m.content.substring(0, 50), role: m.role })));
      
      // Check for duplicates in the database response
      const messageIds = dbMessages.map(m => m.id);
      const uniqueIds = new Set(messageIds);
      if (messageIds.length !== uniqueIds.size) {
        console.warn('⚠️ Duplicate message IDs found in database response!');
        console.warn('All IDs:', messageIds);
        console.warn('Unique IDs:', Array.from(uniqueIds));
      }
      
      // Remove duplicates based on message ID (safety measure)
      const uniqueDbMessages = dbMessages.filter((msg, index, arr) => 
        arr.findIndex(m => m.id === msg.id) === index
      );
      
      if (uniqueDbMessages.length !== dbMessages.length) {
        console.warn(`⚠️ Removed ${dbMessages.length - uniqueDbMessages.length} duplicate messages from UI`);
      }
      
      const uiMessages: Message[] = uniqueDbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      console.log(`Setting ${uiMessages.length} UI messages`);
      setCurrentMessages(uiMessages);
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setCurrentMessages([]);
    }
  };

  const handleNewChat = () => {
    // Clear current session without creating a new one
    // New session will be created when first message is sent
    setCurrentMessages([]);
    selectSession(''); // Clear active session
    setShowSuggestions(true); // Show suggestions for new chat
  };

  const handleCreateNewSession = async (initialMessage?: string) => {
    return await createNewSession(initialMessage);
  };

  const getCurrentSession = () => {
    return activeSession;
  };

  const handleSessionNameUpdate = async (sessionId: string, sessionName: string) => {
    await updateSessionName(sessionId, sessionName);
  };

  const handleSendMessage = async (content: string) => {
    let sessionId = activeSessionId;
    let isNewSession = false;
    
    // Lazy session creation - create new session only when first message is sent
    if (!sessionId) {
      sessionId = await handleCreateNewSession();
      isNewSession = true;
      // Update local state immediately
      selectSession(sessionId);
      setShowSuggestions(false); // Hide suggestions once chat starts
    }

    // Create optimistic user message for immediate display
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    // Immediately show user message for better UX
    setCurrentMessages(prev => [...prev, optimisticUserMessage]);
    console.log(`User message displayed immediately: "${content.substring(0, 50)}..."`); 

    setIsTyping(true);
    try {
      console.log(`Sending message to N8N webhook for session ${sessionId}: "${content.substring(0, 50)}..."`); 
      
      // Send to N8N webhook - the backend will handle adding messages to database
      // Use 'session_created' for first message in new sessions, 'chat_message' for subsequent messages
      const response = await apiService.sendToN8N({
        event_type: isNewSession ? 'session_created' : 'chat_message',
        sessionId: sessionId,
        message: {
          content,
          role: 'user',
          timestamp: new Date().toISOString()
        },
          context: {
            session_history: currentMessages.map(msg => ({
              content: msg.content,
              role: msg.role,
              timestamp: msg.timestamp
            })),
            session_name: getCurrentSession()?.session_name || undefined
          }
        });

        console.log('N8N webhook response received, reloading messages from database...');

        // Handle session name update from N8N response or generate fallback
        if (response?.data?.session_name_update) {
          await handleSessionNameUpdate(sessionId, response.data.session_name_update);
        } else if (!getCurrentSession()?.session_name) {
          // Fallback: Generate session name from first user message
          const fallbackName = content.length > 30 
            ? content.substring(0, 30) + '...' 
            : content;
          await handleSessionNameUpdate(sessionId, fallbackName);
        }
        
        // Reload messages from database to show both user message and AI response
        // (backend adds both messages, this will replace optimistic message with real ones)
        await loadSessionMessages(sessionId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Keep optimistic message visible on N8N error - don't reload from database
      // This prevents the WelcomeScreen from reappearing when N8N fails
      console.log('Keeping optimistic message visible due to N8N error');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionSelect = async (prompt: string) => {
    setShowSuggestions(false); // Hide suggestions immediately
    
    // Create optimistic user message for immediate display
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content: prompt,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Immediately show user message and start typing animation
    setCurrentMessages([optimisticUserMessage]);
    setIsTyping(true);
    
    // Create new session after setting optimistic UI
    const sessionId = await handleCreateNewSession();
    // Note: createNewSession already sets the active session
    
    try {
      console.log(`Sending prompt template to N8N webhook for new session ${sessionId}: "${prompt.substring(0, 50)}..."`); 
      
      // Send to N8N webhook with session_created event type
      const response = await apiService.sendToN8N({
        event_type: 'session_created',
        sessionId: sessionId,
        message: {
          content: prompt,
          role: 'user',
          timestamp: new Date().toISOString()
        },
        context: {
          session_history: [],
          session_name: undefined
        }
      });

      console.log('N8N webhook response received, reloading messages from database...');

      // Handle session name update from N8N response or generate fallback
      if (response?.data?.session_name_update) {
        await handleSessionNameUpdate(sessionId, response.data.session_name_update);
      } else {
        // Fallback: Generate session name from prompt
        const fallbackName = prompt.length > 30 
          ? prompt.substring(0, 30) + '...' 
          : prompt;
        await handleSessionNameUpdate(sessionId, fallbackName);
      }
      
      // Reload messages from database to show both user message and AI response
      await loadSessionMessages(sessionId);
    } catch (error) {
      console.error('Failed to send prompt template message:', error);
      // Keep optimistic message visible on N8N error
      console.log('Keeping optimistic message visible due to N8N error');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar with conditional rendering and animations */}
      <div className={`transition-all duration-300 ease-in-out ${
        showSidebar ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
      }`}>
        <ChatSidebar
          sessions={sessions}
          onSessionSelect={selectSession}
          onNewChat={handleNewChat}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          activeSessionId={activeSessionId || undefined}
        />
      </div>
      
      <ChatMain
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        isLoading={sessionLoading}
        isTyping={isTyping}
        sessionId={activeSessionId}
        showSuggestions={showSuggestions}
        onToggleSuggestions={() => setShowSuggestions(!showSuggestions)}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
      />
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        showSuggestions 
          ? 'opacity-100 max-w-full translate-x-0' 
          : 'opacity-0 max-w-0 translate-x-full'
      }`}>
        <SuggestionsPanel
          onSuggestionSelect={handleSuggestionSelect}
        />
      </div>

      {/* WebhookConfig hidden - N8N is now configured via environment variables */}
    </div>
  );
};

export default Index;
