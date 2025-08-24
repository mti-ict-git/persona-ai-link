import { useState, useEffect } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMain from "@/components/ChatMain";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import WebhookConfig from "@/components/WebhookConfig";
import { useSessionManager } from "@/hooks/useSessionManager";
import { apiService } from "@/services/api";
import { Message as DBMessage } from "@/utils/database";

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
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const {
    sessions: dbSessions,
    activeSession,
    activeSessionId,
    createNewSession,
    selectSession,
    updateSessionName,
    addMessage,
    getSessionMessages,
    isLoading: sessionLoading
  } = useSessionManager();

  // Load configuration from localStorage and environment
  useEffect(() => {
    // First try to load from environment variable
    const envWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    const savedWebhookUrl = localStorage.getItem("n8n_webhook_url");
    
    if (envWebhookUrl) {
      setWebhookUrl(envWebhookUrl);
      // Save to localStorage for consistency
      localStorage.setItem("n8n_webhook_url", envWebhookUrl);
    } else if (savedWebhookUrl) {
      setWebhookUrl(savedWebhookUrl);
    }
  }, []);

  // Save configuration to localStorage
  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem("n8n_webhook_url", webhookUrl);
    }
  }, [webhookUrl]);

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

    try {
      // Add user message to database
      await addMessage(activeSessionId, content, "user");
      
      // Add to UI immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setCurrentMessages(prev => [...prev, userMessage]);

      // Send to N8N webhook if configured
      if (webhookUrl) {
        const response = await apiService.sendToN8N({
          event_type: 'message_sent',
          session_id: activeSessionId,
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

        // Handle session name update from N8N response
        if (response?.session_name_update) {
          await handleSessionNameUpdate(activeSessionId, response.session_name_update);
        }

        // Extract AI response content
        const aiContent = response?.ai_message?.content || "I've processed your message successfully.";

        // Add AI response to database
        await addMessage(activeSessionId, aiContent, "assistant", response?.metadata);
        
        // Add to UI immediately
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiContent,
          role: "assistant",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setCurrentMessages(prev => [...prev, assistantMessage]);
      } else {
        // Show configuration prompt if webhook is not set
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Please configure your N8N webhook URL in the settings to enable AI processing. Click the 'Configure N8N' button to get started.",
          role: "assistant",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        await addMessage(activeSessionId, assistantMessage.content, "assistant");
        setCurrentMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
      <ChatSidebar
        sessions={sessions}
        onSessionSelect={selectSession}
        onNewChat={handleCreateNewSession}
        activeSessionId={activeSessionId || undefined}
      />
      
      <ChatMain
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        isLoading={sessionLoading}
        sessionId={activeSessionId}
      />
      
      <SuggestionsPanel
        onSuggestionSelect={handleSuggestionSelect}
      />

      <WebhookConfig
        webhookUrl={webhookUrl}
        onWebhookUrlChange={setWebhookUrl}
        isConfigOpen={isConfigOpen}
        onConfigToggle={() => setIsConfigOpen(!isConfigOpen)}
      />
    </div>
  );
};

export default Index;
