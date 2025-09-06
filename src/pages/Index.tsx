import { useState, useEffect } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMain from "@/components/ChatMain";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import OnboardingTour from "@/components/OnboardingTour";
import LanguageSelectionDialog from "@/components/LanguageSelectionDialog";
import { Button } from "@/components/ui/button";
// import WebhookConfig from "@/components/WebhookConfig"; // Hidden - N8N configured via env vars
import { useSessionManager } from "@/hooks/useSessionManager";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set()); // Track messages that should have typewriter animation
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  
  // Get user preferences and auth context
  const { preferences, updatePreference, loading: preferencesLoading } = useUserPreferences();
  const { user, isAuthenticated } = useAuth();
  const { changeLanguage, shouldStartTour, setShouldStartTour } = useLanguage();
  const { t } = useTranslation();
  
  // Derive showSuggestions from user preferences
  const showSuggestions = preferences.showFollowUpSuggestions?.value === 'true';

  // Handle typewriter animation completion
  const handleTypewriterComplete = (messageId: string) => {
    setNewMessageIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  };

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

  // Check if user should see language selection dialog (first priority)
  useEffect(() => {
    if (user && preferences.firstTimeLogin?.value === 'true' && !preferences.language?.value) {
      // Show language dialog for first-time users without language preference
      const timer = setTimeout(() => {
        setShowLanguageDialog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, preferences.firstTimeLogin, preferences.language]);

  // Check if user should see onboarding tour (using shouldStartTour from LanguageContext)
  useEffect(() => {
    console.log('🏠 Index.tsx tour effect triggered:', {
      shouldStartTour,
      showOnboardingTour,
      isAuthenticated,
      user: user ? { id: user.id, role: user.role } : null,
      preferences: {
        firstTimeLogin: preferences.firstTimeLogin?.value,
        onboardingCompleted: preferences.onboardingCompleted?.value,
        language: preferences.language?.value
      },
      loading: preferencesLoading
    });
    
    if (shouldStartTour && !showOnboardingTour) {
      console.log('🚀 Index.tsx: Opening onboarding tour because shouldStartTour is TRUE');
      // Small delay to ensure the page is fully loaded
      const timer = setTimeout(() => {
        setShowOnboardingTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (shouldStartTour && showOnboardingTour) {
      console.log('🎪 Index.tsx: Tour already showing, shouldStartTour is TRUE');
    } else if (!shouldStartTour && showOnboardingTour) {
      console.log('🔄 Index.tsx: shouldStartTour is FALSE but tour is showing');
    } else {
      console.log('⏸️ Index.tsx: No tour action needed - shouldStartTour:', shouldStartTour, 'showOnboardingTour:', showOnboardingTour);
    }
  }, [shouldStartTour, showOnboardingTour, user, preferences.firstTimeLogin?.value, preferences.language?.value, preferences.onboardingCompleted?.value, preferencesLoading]);

  // Load messages for active session
  useEffect(() => {
    if (activeSessionId) {
      // Check if we have optimistic messages (temp IDs) that should be preserved
      const hasOptimisticMessages = currentMessages.some(msg => msg.id.startsWith('temp-'));
      
      if (!hasOptimisticMessages) {
        // Only load from database if we don't have optimistic messages
        loadSessionMessages(activeSessionId);
      }
      // If we have optimistic messages, let the handleSendMessage flow handle the reload
    } else {
      setCurrentMessages([]);
    }
  }, [activeSessionId]);

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const dbMessages = await getSessionMessages(sessionId);
      
      // Check for duplicates in the database response
      const messageIds = dbMessages.map(m => m.id);
      const uniqueIds = new Set(messageIds);
      
      // Remove duplicates based on message ID (safety measure)
      const uniqueDbMessages = dbMessages.filter((msg, index, arr) => 
        arr.findIndex(m => m.id === msg.id) === index
      );
      
      const uiMessages: Message[] = uniqueDbMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setCurrentMessages(uiMessages);
      // Clear new message IDs when loading existing messages (no animation for existing messages)
      setNewMessageIds(new Set());
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
    
    // Create optimistic user message for immediate display
    const optimisticUserMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    // Immediately show user message for better UX
    setCurrentMessages(prev => [...prev, optimisticUserMessage]);
    setIsTyping(true);
    
    // Lazy session creation - create new session only when first message is sent
    if (!sessionId) {
      sessionId = await handleCreateNewSession();
      isNewSession = true;
      // Update local state immediately but after optimistic message is set
      selectSession(sessionId);
    }
    try { 
      
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

        // Reload messages from database after N8N response

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
        
        // Store current message count to identify new messages
        const currentMessageCount = currentMessages.length;
        
        // Reload messages from database to show both user message and AI response
        // (backend adds both messages, this will replace optimistic message with real ones)
        await loadSessionMessages(sessionId);
        
        // After loading, identify new assistant messages for typewriter animation
        const updatedMessages = await getSessionMessages(sessionId);
        const newAssistantMessages = updatedMessages
          .filter(msg => msg.role === 'assistant')
          .slice(Math.max(0, currentMessageCount - 1)); // Get messages added after the user message
        
        if (newAssistantMessages.length > 0) {
          const newIds = new Set(newAssistantMessages.map(msg => msg.id));
          setNewMessageIds(newIds);
        }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Keep optimistic message visible on N8N error - don't reload from database
      // This prevents the WelcomeScreen from reappearing when N8N fails
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionSelect = async (prompt: string) => {
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

      // Reload messages from database after N8N response

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
      
      // Store current message count to identify new messages (should be 1 for the optimistic message)
      const currentMessageCount = currentMessages.length;
      
      // Reload messages from database to show both user message and AI response
      await loadSessionMessages(sessionId);
      
      // After loading, identify new assistant messages for typewriter animation
      const updatedMessages = await getSessionMessages(sessionId);
      const newAssistantMessages = updatedMessages
        .filter(msg => msg.role === 'assistant')
        .slice(Math.max(0, currentMessageCount - 1)); // Get messages added after the user message
      
      if (newAssistantMessages.length > 0) {
        const newIds = new Set(newAssistantMessages.map(msg => msg.id));
        setNewMessageIds(newIds);
      }
    } catch (error) {
      console.error('Failed to send prompt template message:', error);
      // Keep optimistic message visible on N8N error
    } finally {
      setIsTyping(false);
    }
  };

  const handleLanguageSelect = async (language: string) => {
    try {
      // Update language preference in database
      await updatePreference('language', language);
      // Mark first time login as completed
      await updatePreference('firstTimeLogin', 'false');
      // Change language in the app
      changeLanguage(language);
      // Close the dialog
      setShowLanguageDialog(false);
    } catch (error) {
      console.error('Failed to set language preference:', error);
    }
  };

  return (
    <div data-tour="welcome" className="h-screen flex bg-background">
      {/* Sidebar with conditional rendering and animations */}
      <div className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
        showSidebar ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
      }`}>
        <ChatSidebar
          sessions={sessions}
          onSessionSelect={selectSession}
          onNewChat={handleNewChat}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          activeSessionId={activeSessionId || undefined}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />
      </div>
      
      <ChatMain
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        isLoading={sessionLoading}
        isTyping={isTyping}
        sessionId={activeSessionId}
        showSuggestions={showSuggestions}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        newMessageIds={newMessageIds}
        onTypewriterComplete={handleTypewriterComplete}
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
      
      {/* Language Selection Dialog */}
      <LanguageSelectionDialog
        open={showLanguageDialog}
        onLanguageSelect={handleLanguageSelect}
      />
      
      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboardingTour}
        onClose={() => {
          console.log('❌ Index.tsx: Tour closed by user (not completed)');
          setShowOnboardingTour(false);
        }}
        onComplete={() => {
          console.log('✅ Index.tsx: Tour completed, updating preferences');
          updatePreference('onboardingCompleted', 'true').then(() => {
            console.log('✅ Index.tsx: onboardingCompleted preference updated to true');
          }).catch((error) => {
            console.error('❌ Index.tsx: Failed to update onboarding completion:', error);
          });
          setShowOnboardingTour(false);
          setShouldStartTour(false);
          console.log('✅ Index.tsx: Tour closed after completion');
        }}
      />
      
      {/* Start Tour Button - Test Button */}
      <Button
        data-tour="completion"
        onClick={() => setShowOnboardingTour(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        size="sm"
      >
        Start Tour
      </Button>
    </div>
  );
};

export default Index;
