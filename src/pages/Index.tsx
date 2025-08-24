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
  const [showSuggestions, setShowSuggestions] = useState(true);
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
      loadSessionMessages(activeSessionId);
    } else {
      setCurrentMessages([]);
    }
  }, [activeSessionId]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const dbMessages = await getSessionMessages(sessionId);
      const uiMessages: Message[] = dbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setCurrentMessages(uiMessages);
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setCurrentMessages([]);
    }
  };

  const handleCreateNewSession = async (initialMessage?: string) => {
    await createNewSession(initialMessage);
  };

  const getCurrentSession = () => {
    return activeSession;
  };

  const handleSessionNameUpdate = async (sessionId: string, sessionName: string) => {
    await updateSessionName(sessionId, sessionName);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId) {
      await handleCreateNewSession(content);
      return;
    }

    const currentSession = getCurrentSession();
    if (!currentSession) return;

    setIsTyping(true);
    try {
      // Add user message to database
      await addMessage(activeSessionId, {
        content,
        role: "user"
        // message_order will be automatically set by addMessage
      });
      
      // Add to UI immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setCurrentMessages(prev => [...prev, userMessage]);

      // Send to N8N webhook
      const response = await apiService.sendToN8N({
        event_type: 'message_sent',
        sessionId: activeSessionId,
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
            session_name: currentSession?.session_name || undefined
          }
        });

        // Handle session name update from N8N response or generate fallback
        if (response?.data?.session_name_update) {
          await handleSessionNameUpdate(activeSessionId, response.data.session_name_update);
        } else if (!currentSession?.session_name) {
          // Fallback: Generate session name from first user message
          const fallbackName = content.length > 30 
            ? content.substring(0, 30) + '...' 
            : content;
          await handleSessionNameUpdate(activeSessionId, fallbackName);
        }

        // Extract AI response content from the correct path
        const aiContent = response?.data?.message || "I've processed your message successfully.";

        // Add AI response to database
        await addMessage(activeSessionId, {
          content: aiContent,
          role: "assistant",
          message_order: Date.now() + 1,
          metadata: response?.data?.raw_response
        });
        
        // Add to UI immediately
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiContent,
          role: "assistant",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setCurrentMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionSelect = (prompt: string) => {
    if (!activeSessionId) {
      handleCreateNewSession(prompt);
      // Wait for next render to send message
      setTimeout(() => handleSendMessage(prompt), 100);
    } else {
      handleSendMessage(prompt);
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
          onNewChat={handleCreateNewSession}
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
