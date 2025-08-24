import { useState, useEffect } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMain from "@/components/ChatMain";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import WebhookConfig from "@/components/WebhookConfig";
import { useN8NWebhook } from "@/hooks/useN8NWebhook";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

const Index = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { sendToN8N, isLoading } = useN8NWebhook();

  // Load configuration from localStorage
  useEffect(() => {
    const savedWebhookUrl = localStorage.getItem("n8n_webhook_url");
    if (savedWebhookUrl) {
      setWebhookUrl(savedWebhookUrl);
    }

    const savedSessions = localStorage.getItem("chat_sessions");
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  // Save configuration to localStorage
  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem("n8n_webhook_url", webhookUrl);
    }
  }, [webhookUrl]);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("chat_sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Conversation",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const getCurrentSession = () => {
    return sessions.find(session => session.id === activeSessionId);
  };

  const updateSessionTitle = (sessionId: string, firstMessage: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "") }
        : session
    ));
  };

  const addMessageToSession = (sessionId: string, message: Message) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, messages: [...session.messages, message] }
        : session
    ));
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId) {
      createNewSession();
      return;
    }

    const currentSession = getCurrentSession();
    if (!currentSession) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    addMessageToSession(activeSessionId, userMessage);

    // Update session title if it's the first message
    if (currentSession.messages.length === 0) {
      updateSessionTitle(activeSessionId, content);
    }

    // Send to N8N webhook if configured
    if (webhookUrl) {
      const response = await sendToN8N(
        { webhookUrl, sessionId: activeSessionId },
        content,
        currentSession.messages
      );

      // Add AI response (mock response for now - replace with actual N8N response)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.success 
          ? (response.data?.response || "I've received your message and processed it through N8N. How can I help you further?")
          : "I apologize, but I'm having trouble connecting to the processing service. Please check your N8N configuration.",
        role: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      addMessageToSession(activeSessionId, assistantMessage);
    } else {
      // Show configuration prompt if webhook is not set
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Please configure your N8N webhook URL in the settings to enable AI processing. Click the 'Configure N8N' button to get started.",
        role: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      addMessageToSession(activeSessionId, assistantMessage);
    }
  };

  const handleSuggestionSelect = (prompt: string) => {
    if (!activeSessionId) {
      createNewSession();
      // Wait for next render to send message
      setTimeout(() => handleSendMessage(prompt), 100);
    } else {
      handleSendMessage(prompt);
    }
  };

  const currentMessages = getCurrentSession()?.messages || [];

  return (
    <div className="h-screen flex bg-background">
      <ChatSidebar
        sessions={sessions}
        onSessionSelect={setActiveSessionId}
        onNewChat={createNewSession}
        activeSessionId={activeSessionId}
      />
      
      <ChatMain
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
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
