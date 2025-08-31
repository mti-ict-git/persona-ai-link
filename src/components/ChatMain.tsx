import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, RefreshCw, PanelRightOpen, PanelRightClose, Menu, X, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TypingAnimation from "@/components/TypingAnimation";
import TypewriterText from "@/components/TypewriterText";
import MessageFeedback from "@/components/MessageFeedback";

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
  newMessageIds?: Set<string>; // Track which messages should have typewriter animation
  onTypewriterComplete?: (messageId: string) => void; // Callback when typewriter animation completes
}

const ChatMain = ({ messages, onSendMessage, isLoading = false, isTyping = false, sessionId, showSuggestions = true, onToggleSuggestions, showSidebar = true, onToggleSidebar, newMessageIds = new Set(), onTypewriterComplete }: ChatMainProps) => {
  // Motivational HR messages
  const motivationalMessages = [
    "Empowering your HR journey",
    "Building better workplaces together",
    "Your HR success starts here",
    "Transforming HR, one conversation at a time",
    "Making HR simple and effective",
    "Your partner in people management",
    "Elevating HR excellence",
    "Streamlining your HR processes",
    "Innovating the future of HR",
    "Where HR meets intelligence",
    "Optimizing your workforce potential",
    "Creating positive workplace experiences"
  ];
  
  // Get a consistent motivational message based on sessionId
  const getMotivationalMessage = () => {
    if (!sessionId) return "Ready to assist you";
    const index = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % motivationalMessages.length;
    return motivationalMessages[index];
  };
  const [inputMessage, setInputMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();



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

  const suggestions = [
    {
      id: "1",
      title: "Kebijakan Golongan & Jabatan",
      description: "Berikan informasi tentang struktur golongan dan kebijakan jabatan di perusahaan",
      prompt: "Can you provide information about employee grade structure and position policies in the company?"
    },
    {
      id: "2", 
      title: "Peraturan Perusahaan",
      description: "Bagaimana aturan dan regulasi yang berlaku di perusahaan ini",
      prompt: "What are the company rules and regulations that apply to all employees?"
    },
    {
      id: "3",
      title: "Employee Benefits",
      description: "Informasi lengkap mengenai benefit dan tunjangan karyawan",
      prompt: "Can you provide complete information about employee benefits and allowances?"
    },
    {
      id: "4",
      title: "IT Policy",
      description: "Kebijakan penggunaan teknologi informasi dan keamanan data",
      prompt: "What are the IT policies regarding technology usage and data security?"
    }
  ];

  const WelcomeScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-2">
          Welcome To
        </h1>
        <div className="flex items-center justify-center gap-4 mb-4">
          <img 
            src="/MTI-removebg-preview.png" 
            alt="MTI Logo" 
            className="w-12 h-12 object-contain"
          />
          <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Tsindeka AI
          </h2>
        </div>
        <p className="text-muted-foreground mb-12">
          Get started by scripting a task, and Chat can do the rest. Not sure where to begin?
        </p>
        
        {/* Suggestion Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => onSendMessage(suggestion.prompt)}
              className="p-4 text-left bg-card border border-border rounded-xl hover:shadow-lg hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="flex items-start gap-3">
                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md flex-shrink-0">
                  {suggestion.id}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-chat-main">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/50 bg-gradient-to-r from-background/95 to-background backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-9 w-9 rounded-xl hover:bg-muted/80 transition-all duration-200"
              title={showSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
              <img 
                src="/MTI-removebg-preview.png" 
                alt="MTI Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg">Your Smart HR Companion</h1>
              <p className="text-xs text-muted-foreground/80 font-medium">{getMotivationalMessage()}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="h-9 w-9 rounded-xl hover:bg-muted/80 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {onToggleSuggestions && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleSuggestions}
              className="h-9 w-9 rounded-xl hover:bg-muted/80 transition-all duration-200"
            >
              {showSuggestions ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </Button>
          )}
          

        </div>
      </div>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={cn(
              "flex gap-4 max-w-4xl",
              message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                message.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                  : "bg-gradient-to-br from-muted to-muted/80 text-muted-foreground border border-border/50"
              )}>
                <span className="text-sm font-bold">
                  {message.role === "user" ? "U" : "AI"}
                </span>
              </div>
              
              <div className={cn(
                "p-5 rounded-2xl max-w-[85%] shadow-sm",
                message.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                  : "bg-gradient-to-br from-background to-muted/30 text-foreground border border-border/50 backdrop-blur-sm"
              )}>
                {message.role === "assistant" ? (
                  <div className="markdown-content">
                    {newMessageIds.has(message.id) ? (
                      <TypewriterText 
                        text={message.content}
                        speed={30}
                        isMarkdown={true}
                        className=""
                        onComplete={() => onTypewriterComplete?.(message.id)}
                      />
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-foreground">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary/30 pl-4 py-2 mb-3 bg-muted/30 rounded-r-lg italic">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                                {children}
                              </code>
                            ) : (
                              <code className={`block bg-muted/80 p-3 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre ${className}`}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => <pre className="mb-3 overflow-x-auto">{children}</pre>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          a: ({ children, href }) => (
                            <a 
                              href={href} 
                              className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors" 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                          table: ({ children }) => (
                            <table className="border-collapse border border-border/50 mb-3 rounded-lg overflow-hidden">
                              {children}
                            </table>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border/50 px-3 py-2 bg-muted/60 font-semibold text-left">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border/50 px-3 py-2">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                    <MessageFeedback
                      messageId={message.id}
                      messageContent={message.content}
                      sessionId={sessionId || 'default'}
                      className="mt-2"
                    />
                  </div>
                ) : (
                  newMessageIds.has(message.id) ? (
                    <TypewriterText 
                      text={message.content}
                      speed={20}
                      isMarkdown={false}
                      className="whitespace-pre-wrap leading-relaxed"
                      onComplete={() => onTypewriterComplete?.(message.id)}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  )
                )}
                <p className="text-xs opacity-60 mt-3 font-medium">{message.timestamp}</p>
              </div>
            </div>
          ))}
          
          {(isLoading || isTyping) && (
            <div className="flex gap-4 max-w-4xl mr-auto">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center shadow-sm border border-border/50">
                <span className="text-sm font-bold text-muted-foreground">AI</span>
              </div>
              <div className="bg-gradient-to-br from-background to-muted/30 rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
                <TypingAnimation />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-border/50 bg-gradient-to-b from-background/80 to-background backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-background/90 border border-border/60 rounded-2xl shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="resize-none border-0 focus:ring-0 focus:outline-none bg-transparent p-5 pr-24 min-h-[64px] max-h-[120px] text-base placeholder:text-muted-foreground/70"
              rows={1}
            />
            
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 rounded-xl hover:bg-muted/80 transition-all duration-200"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="h-9 w-9 p-0 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground/70 text-center mt-3 space-y-1">
            <p className="font-medium">AI can make mistakes. Check important info.</p>
            <p>© 2024 PT. Merdeka Tsingshan Indonesia. All rights reserved.</p>
            <p>Support: <a href="mailto:mti.icthelpdesk@merdekabattery.com" className="text-primary hover:underline">mti.icthelpdesk@merdekabattery.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMain;