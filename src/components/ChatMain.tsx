import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, RefreshCw, PanelRightOpen, PanelRightClose, Menu, X, Settings, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TypingAnimation from "@/components/TypingAnimation";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface ChatMainProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  isTyping?: boolean;
  sessionId?: string;
  showSuggestions?: boolean;
  onToggleSuggestions?: () => void;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

const ChatMain = ({ messages, onSendMessage, isLoading = false, isTyping = false, sessionId, showSuggestions = true, onToggleSuggestions, showSidebar = true, onToggleSidebar }: ChatMainProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    
    onSendMessage(inputMessage);
    setInputMessage("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const WelcomeScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-2">
          Welcome To
        </h1>
        <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
          AI Insight
        </h2>
        <p className="text-muted-foreground mb-8">
          Get started by scripting a task, and Chat can do the rest. Not sure where to begin?
        </p>
        
        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Prompt Suggestion</h3>
          </div>
          <p className="text-muted-foreground text-left">
            Try asking about data analysis, content creation, or technical questions to get started.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-chat-main">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button 
                onClick={onToggleSidebar}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                aria-label={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
              >
                <Menu className="w-5 h-5 text-foreground" />
              </button>
            )}
            <RefreshCw className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">AI Insight</h2>
          </div>
          <div className="flex items-center gap-2">
            {onToggleSuggestions && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onToggleSuggestions}
                className="flex items-center gap-2"
              >
                {showSuggestions ? (
                  <>
                    <PanelRightClose className="w-4 h-4" />
                    Hide Suggestions
                  </>
                ) : (
                  <>
                    <PanelRightOpen className="w-4 h-4" />
                    Show Suggestions
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm">
              Start Tour
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/training')}
              className="flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Training
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/login')}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search in chat */}
        <div className="mt-4">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search chat history..."
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4 max-w-4xl",
                message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === "user" 
                  ? "bg-gradient-primary" 
                  : "bg-muted"
              )}>
                <span className="text-sm font-semibold">
                  {message.role === "user" ? "U" : "AI"}
                </span>
              </div>
              
              <div className={cn(
                "p-4 rounded-2xl max-w-[80%]",
                message.role === "user"
                  ? "bg-chat-message-user text-chat-message-user-foreground"
                  : "bg-chat-message-assistant text-chat-message-assistant-foreground border border-border"
              )}>
                {message.role === "assistant" ? (
                  <div className="markdown-content">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Customize markdown components for better styling
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                          ) : (
                            <code className="block bg-muted p-2 rounded text-sm font-mono overflow-x-auto">{children}</code>
                          );
                        },
                        pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic mb-2">{children}</blockquote>,
                        a: ({ children, href }) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                        table: ({ children }) => <table className="border-collapse border border-border mb-2">{children}</table>,
                        th: ({ children }) => <th className="border border-border px-2 py-1 bg-muted font-semibold">{children}</th>,
                        td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="text-xs opacity-70 mt-2">{message.timestamp}</p>
              </div>
            </div>
          ))}
          
          {(isLoading || isTyping) && (
            <div className="flex gap-4 max-w-4xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-semibold">AI</span>
              </div>
              <div className="bg-chat-message-assistant rounded-2xl border border-border">
                <TypingAnimation />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-border bg-gradient-subtle">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-background border border-border rounded-xl shadow-card">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask the assistant for help or insights..."
              className="resize-none border-0 focus:ring-0 focus:outline-none bg-transparent p-4 pr-20 min-h-[60px] max-h-[120px]"
              rows={1}
            />
            
            <div className="absolute right-2 bottom-2 flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="h-8 w-8 p-0 bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI-generated, for reference only
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatMain;