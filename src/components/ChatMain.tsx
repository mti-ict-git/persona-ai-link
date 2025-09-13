import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, RefreshCw, PanelRightOpen, PanelRightClose, Menu, X, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TypingAnimation from "@/components/TypingAnimation";
import TypewriterText from "@/components/TypewriterText";
import MessageFeedback from "@/components/MessageFeedback";


import RetrievedTextTooltip from "@/components/RetrievedTextTooltip";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
  metadata?: {
    original_retrieved_text?: string;
    n8n_response?: {
      original_retrieved_text?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}



interface ChatMainProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  isTyping?: boolean;
  sessionId?: string;
  showSuggestions?: boolean;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
  newMessageIds?: Set<string>; // Track which messages should have typewriter animation
  onTypewriterComplete?: (messageId: string) => void; // Callback when typewriter animation completes
}

const ChatMain = ({ messages, onSendMessage, isLoading = false, isTyping = false, sessionId, showSuggestions = true, showSidebar = true, onToggleSidebar, newMessageIds = new Set(), onTypewriterComplete }: ChatMainProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [hasWideContent, setHasWideContent] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Motivational HR messages
  const motivationalMessages = [
    t('chat.motivational.empoweringJourney'),
    t('chat.motivational.buildingWorkplaces'),
    t('chat.motivational.successStartsHere'),
    t('chat.motivational.transformingHR'),
    t('chat.motivational.makingSimple'),
    t('chat.motivational.partnerInManagement'),
    t('chat.motivational.elevatingExcellence'),
    t('chat.motivational.streamliningProcesses'),
    t('chat.motivational.innovatingFuture'),
    t('chat.motivational.hrMeetsIntelligence'),
    t('chat.motivational.optimizingPotential'),
    t('chat.motivational.positiveExperiences')
  ];
  
  // Get a consistent motivational message based on sessionId
  const getMotivationalMessage = () => {
    if (!sessionId) return t('brand.readyToAssist');
    const index = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % motivationalMessages.length;
    return motivationalMessages[index];
  };
  const [inputMessage, setInputMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Function to detect wide content like tables
  const detectWideContent = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const tables = messagesContainerRef.current.querySelectorAll('table');
    const codeBlocks = messagesContainerRef.current.querySelectorAll('pre, code:not(code:not([class]))');
    const longLines = messagesContainerRef.current.querySelectorAll('p, li');
    
    let hasWide = false;
    
    // Check for tables
    tables.forEach(table => {
      if (table.scrollWidth > 600) {
        hasWide = true;
      }
    });
    
    // Check for wide code blocks
    codeBlocks.forEach(block => {
      if (block.scrollWidth > 600) {
        hasWide = true;
      }
    });
    
    // Check for long text lines
    longLines.forEach(element => {
      const text = element.textContent || '';
      if (text.length > 100 || element.scrollWidth > 600) {
        hasWide = true;
      }
    });
    
    setHasWideContent(hasWide);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Detect wide content after messages update
    const timer = setTimeout(() => {
      detectWideContent();
    }, 100); // Small delay to ensure DOM is updated
    
    return () => clearTimeout(timer);
  }, [messages, detectWideContent]);

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
      title: t('chat.suggestions.gradePolicy.title'),
      description: t('chat.suggestions.gradePolicy.description'),
      prompt: t('chat.suggestions.gradePolicy.prompt')
    },
    {
      id: "2", 
      title: t('chat.suggestions.companyRules.title'),
      description: t('chat.suggestions.companyRules.description'),
      prompt: t('chat.suggestions.companyRules.prompt')
    },
    {
      id: "3",
      title: t('chat.suggestions.employeeBenefits.title'),
      description: t('chat.suggestions.employeeBenefits.description'),
      prompt: t('chat.suggestions.employeeBenefits.prompt')
    },
    {
      id: "4",
      title: t('chat.suggestions.itPolicy.title'),
      description: t('chat.suggestions.itPolicy.description'),
      prompt: t('chat.suggestions.itPolicy.prompt')
    }
  ];

  const WelcomeScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-2">
          {t('chat.welcomeTo')}
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
          {t('chat.getStartedDescription')}
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
    <div className="flex-1 flex flex-col bg-chat-main h-full">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-background/95 to-background backdrop-blur-sm flex-shrink-0",
        isMobile ? "p-3 min-h-[60px]" : "p-5"
      )}>
        <div className={cn(
          "flex items-center",
          isMobile ? "gap-3" : "gap-4"
        )}>
          {onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className={cn(
                "rounded-xl hover:bg-muted/80 transition-all duration-200",
                isMobile ? "h-10 w-10" : "h-9 w-9"
              )}
              title={showSidebar ? t('sidebar.hideSidebar') : t('sidebar.showSidebar')}
            >
              {showSidebar ? <X className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} /> : <Menu className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />}
            </Button>
          )}
          
          <div className={cn(
            "flex items-center",
            isMobile ? "gap-2" : "gap-3"
          )}>
            <div className={cn(
              "rounded-xl flex items-center justify-center shadow-sm",
              isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <img 
                src="/MTI-removebg-preview.png" 
                alt="MTI Logo" 
                className={cn(
                  "object-contain",
                  isMobile ? "h-6 w-6" : "h-8 w-8"
                )}
              />
            </div>
            <div>
              <h1 className={cn(
                "font-bold text-foreground",
                isMobile ? "text-base" : "text-lg"
              )}>{t('brand.smartHRCompanion')}</h1>
              <p className={cn(
                "text-muted-foreground/80 font-medium",
                isMobile ? "text-xs hidden" : "text-xs"
              )}>{getMotivationalMessage()}</p>
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
          

          

        </div>
      </div>

      {/* Messages Area */}
      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div ref={messagesContainerRef} className={cn(
          "flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
          isMobile ? "p-3 pb-2" : "p-6"
        )}>
          {messages.map((message, index) => {
            // Find the previous user question for AI responses
            const previousQuestion = message.role === 'assistant' && index > 0 
              ? messages.slice(0, index).reverse().find(m => m.role === 'user')?.content || ''
              : '';
            
            return (
            <div key={message.id} className={cn(
              "flex transition-all duration-300",
              isMobile ? "gap-2 mb-3" : "gap-4",
              hasWideContent ? "max-w-[90%]" : isMobile ? "max-w-full" : "max-w-4xl",
              message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}>
              <div className={cn(
                "rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                isMobile ? "w-7 h-7 mt-1" : "w-10 h-10",
                message.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                  : "bg-gradient-to-br from-muted to-muted/80 text-muted-foreground border border-border/50"
              )}>
                <span className={cn(
                  "font-bold",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {message.role === "user" ? "U" : "AI"}
                </span>
              </div>
              
              <div className={cn(
                "rounded-2xl shadow-sm transition-all duration-300",
                isMobile ? "p-3 max-w-[80%]" : "p-5 max-w-[85%]",
                message.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                  : "bg-gradient-to-br from-background to-muted/30 text-foreground border border-border/50 backdrop-blur-sm"
              )}>
                {message.role === "assistant" ? (
                  <RetrievedTextTooltip 
                    messageContent={message.content}
                    originalRetrievedText={message.metadata?.original_retrieved_text || message.metadata?.n8n_response?.original_retrieved_text}
                  >
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
                          p: ({ children }) => <p className={cn("last:mb-0 leading-relaxed", isMobile ? "mb-2 text-sm" : "mb-3")}>{children}</p>,
                          h1: ({ children }) => <h1 className={cn("font-bold text-foreground", isMobile ? "text-lg mb-3" : "text-2xl mb-4")}>{children}</h1>,
                          h2: ({ children }) => <h2 className={cn("font-semibold text-foreground", isMobile ? "text-base mb-2" : "text-xl mb-3")}>{children}</h2>,
                          h3: ({ children }) => <h3 className={cn("font-medium text-foreground", isMobile ? "text-sm mb-2" : "text-lg mb-2")}>{children}</h3>,
                          ul: ({ children }) => <ul className={cn("list-disc list-inside space-y-1", isMobile ? "mb-2 text-sm" : "mb-3")}>{children}</ul>,
                          ol: ({ children }) => <ol className={cn("list-decimal list-inside space-y-1", isMobile ? "mb-2 text-sm" : "mb-3")}>{children}</ol>,
                          li: ({ children }) => <li className={cn("leading-relaxed", isMobile ? "text-sm" : "")}>{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote className={cn("border-l-4 border-primary/30 pl-4 py-2 bg-muted/30 rounded-r-lg italic", isMobile ? "mb-2 text-sm" : "mb-3")}>
                              {children}
                            </blockquote>
                          ),
                          code: ({ children, className }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className={cn("bg-muted/60 px-1.5 py-0.5 rounded font-mono text-foreground", isMobile ? "text-xs" : "text-sm")}>
                                {children}
                              </code>
                            ) : (
                              <code className={cn(`block bg-muted/80 rounded-lg font-mono overflow-x-auto whitespace-pre ${className}`, isMobile ? "p-2 text-xs" : "p-3 text-sm")}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => <pre className={cn("overflow-x-auto", isMobile ? "mb-2" : "mb-3")}>{children}</pre>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          a: ({ href, children }) => {
                            // All links are now handled as regular links since we have reference tooltips
                            return (
                              <a
                                href={href}
                                className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {children}
                              </a>
                            );
                          },

                          table: ({ children }) => (
                            <div className="overflow-x-auto mb-3 rounded-lg border border-border/50">
                              <table className="border-collapse w-full min-w-max">
                                {children}
                              </table>
                            </div>
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
                        previousQuestion={previousQuestion}
                        className="mt-2"
                        originalText={message.metadata?.original_retrieved_text || message.metadata?.n8n_response?.original_retrieved_text || ''}
                      />
                    </div>
                  </RetrievedTextTooltip>
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
                <p className={cn(
                  "opacity-60 font-medium",
                  isMobile ? "text-xs mt-2" : "text-xs mt-3"
                )}>{message.timestamp}</p>
              </div>
            </div>
            );
          })}
          
          {(isLoading || isTyping) && (
            <div className={cn(
              "flex mr-auto transition-all duration-300",
              isMobile ? "gap-2 mb-3" : "gap-4",
              hasWideContent ? "max-w-[90%]" : isMobile ? "max-w-full" : "max-w-4xl"
            )}>
              <div className={cn(
                "rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center shadow-sm border border-border/50",
                isMobile ? "w-7 h-7 mt-1" : "w-10 h-10"
              )}>
                <span className={cn(
                  "font-bold text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>AI</span>
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
      <div className={cn(
        "border-t border-border/50 bg-gradient-to-b from-background/80 to-background backdrop-blur-sm flex-shrink-0 sticky bottom-0",
        isMobile ? "p-3 pb-safe" : "p-6"
      )}>
        <div className={cn(
          "mx-auto transition-all duration-300",
          hasWideContent ? "max-w-[90%]" : isMobile ? "max-w-full" : "max-w-4xl"
        )}>
          <div className={cn(
            "relative bg-background/90 border border-border/60 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300",
            isMobile ? "rounded-xl" : "rounded-2xl"
          )}>
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.askMeAnything')}
              className={cn(
                "resize-none border-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-muted-foreground/70",
                isMobile ? "p-4 pr-24 min-h-[52px] max-h-[120px] text-base leading-relaxed" : "p-5 pr-24 min-h-[64px] max-h-[120px] text-base"
              )}
              rows={1}
            />
            
            <div className={cn(
              "absolute flex items-center gap-2",
              isMobile ? "right-3 bottom-3" : "right-3 bottom-3"
            )}>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "p-0 hover:bg-muted/80 transition-all duration-200",
                  isMobile ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-xl"
                )}
              >
                <Paperclip className={cn(
                  "text-muted-foreground",
                  isMobile ? "w-5 h-5" : "w-4 h-4"
                )} />
              </Button>
              
              <Button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className={cn(
                  "p-0 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  isMobile ? "h-11 w-11 rounded-xl hover:scale-[1.02] disabled:hover:scale-100" : "h-9 w-9 rounded-xl hover:scale-105 disabled:hover:scale-100"
                )}
              >
                <Send className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
              </Button>
            </div>
          </div>
          
          <div className={cn(
            "text-muted-foreground/70 text-center space-y-1",
            isMobile ? "text-xs mt-2 px-2" : "text-xs mt-3"
          )}>
            <p className={cn("font-medium", isMobile ? "text-xs" : "")}>{t('footer.aiDisclaimer')}</p>
            <p className={cn(isMobile ? "text-xs" : "")}>{t('footer.copyright')}</p>
            <p className={cn(isMobile ? "text-xs" : "")}>{t('footer.support')} <a href={`mailto:${t('footer.supportEmail')}`} className="text-primary hover:underline">{t('footer.supportEmail')}</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMain;