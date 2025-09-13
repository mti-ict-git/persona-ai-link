import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, MessageCircle, MoreHorizontal, LogOut, Trash2, Edit2, Check, X, Menu, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ChatSession {
  id: string;
  title: string;
  session_name?: string;
  timestamp: string;
  isActive?: boolean;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  activeSessionId?: string;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
}

const ChatSidebar = ({ sessions, onSessionSelect, onNewChat, onDeleteSession, onRenameSession, activeSessionId, showSidebar = true, onToggleSidebar }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const filteredSessions = sessions.filter(session => {
    const displayName = session.session_name || session.title;
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDeleteSession = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete);
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleStartRename = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const handleSaveRename = () => {
    if (!editingSessionId || !editingName.trim()) {
      return;
    }

    const trimmedName = editingName.trim();
    
    // Validation: Check length (1-255 characters)
    if (trimmedName.length < 1 || trimmedName.length > 255) {
      alert('Session name must be between 1 and 255 characters.');
      return;
    }

    // Validation: Check for invalid characters (basic validation)
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      alert('Session name contains invalid characters. Please avoid: < > : " / \\ | ? *');
      return;
    }

    onRenameSession(editingSessionId, trimmedName);
    setEditingSessionId(null);
    setEditingName("");
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditingName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  return (
    <div data-tour="sidebar" className={cn(
      "bg-gradient-to-b from-chat-sidebar to-chat-sidebar/95 flex flex-col h-full backdrop-blur-sm",
      isMobile ? "w-full" : "w-80 border-r border-border/50"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b border-border/50",
        isMobile ? "p-4" : "p-5"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          isMobile ? "mb-4" : "mb-5"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm">
              <img 
                src="/MTI-removebg-preview.png" 
                alt="MTI Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <h1 className={cn(
                "font-bold text-foreground",
                isMobile ? "text-base" : "text-lg"
              )}>{t('brand.tsindekaAI')}</h1>
              <p className="text-xs text-muted-foreground/80 font-medium">{t('brand.mtiAIAssistant')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className={cn(
                  "rounded-xl hover:bg-muted/80 transition-all duration-200",
                  isMobile ? "h-10 w-10" : "h-9 w-9"
                )}
                title={isMobile ? t('sidebar.closeSidebar') : t('sidebar.hideSidebar')}
              >
                {isMobile ? <X className="w-5 h-5" /> : <Menu className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className={cn(
          "relative",
          isMobile ? "mb-3" : "mb-4"
        )}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input
            placeholder={t('sidebar.searchConversations')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/80 border-border/60 rounded-xl backdrop-blur-sm hover:bg-background/90 transition-all duration-200 focus:bg-background"
          />
        </div>
        
        {/* New Chat Button */}
        <Button 
          onClick={onNewChat}
          className={cn(
            "w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-lg transition-all duration-200 rounded-xl font-medium",
            isMobile ? "h-12 text-base hover:scale-[1.01]" : "hover:scale-[1.02]"
          )}
        >
          <Plus className={cn(isMobile ? "w-5 h-5 mr-3" : "w-4 h-4 mr-2")} />
          {t('sidebar.newChat')}
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn(isMobile ? "p-2" : "p-3")}>
          <h3 className="text-sm font-semibold text-muted-foreground/80 px-3 py-3 uppercase tracking-wide">{t('sidebar.recentChats')}</h3>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">{t('chat.noConversationsYet')}</p>
                <p className="text-xs opacity-70 mt-1">{t('chat.startNewChatToBegin')}</p>
              </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "w-full p-4 rounded-xl mb-2 group hover:bg-chat-sidebar-hover/80 transition-all duration-200 relative backdrop-blur-sm border border-transparent hover:border-border/30",
                  activeSessionId === session.id && "bg-gradient-to-r from-chat-sidebar-active to-chat-sidebar-active/80 border-primary/30 shadow-sm"
                )}
              >
                <div className="flex items-center justify-between">
                  {editingSessionId === session.id ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className={cn(
                            "flex-1 rounded-lg bg-background/80 border-border/60",
                            isMobile ? "text-base h-12" : "text-sm h-9"
                          )}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveRename}
                          className={cn(
                            "p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200",
                            isMobile ? "h-12 w-12" : "h-9 w-9"
                          )}
                        >
                          <Check className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelRename}
                          className={cn(
                            "p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200",
                            isMobile ? "h-12 w-12" : "h-9 w-9"
                          )}
                        >
                          <X className={cn(isMobile ? "w-5 h-5" : "w-4 h-4")} />
                        </Button>
                      </div>
                      <p className={cn(
                        "text-muted-foreground/70 mt-2 font-medium",
                        isMobile ? "text-sm" : "text-xs"
                      )}>
                        {session.timestamp}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSessionSelect(session.id)}
                      className="flex-1 min-w-0 text-left group-hover:scale-[1.01] transition-transform duration-200"
                    >
                      <h4 className={cn(
                        "font-semibold text-foreground truncate leading-relaxed",
                        isMobile ? "text-base" : "text-sm"
                      )}>
                        {session.session_name || session.title}
                      </h4>
                      <p className={cn(
                        "text-muted-foreground/70 mt-1 font-medium",
                        isMobile ? "text-sm" : "text-xs"
                      )}>
                        {session.timestamp}
                      </p>
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-all duration-200 p-0 rounded-lg hover:bg-muted/80",
                          isMobile ? "h-12 w-12" : "h-9 w-9"
                        )}
                      >
                        <MoreHorizontal className={cn(
                          "text-muted-foreground",
                          isMobile ? "w-5 h-5" : "w-4 h-4"
                        )} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-lg">
                      <DropdownMenuItem
                        onClick={() => handleStartRename(session.id, session.session_name || session.title)}
                        className={cn(
                          "rounded-lg",
                          isMobile ? "text-base py-3" : "text-sm"
                        )}
                      >
                        <Edit2 className={cn(isMobile ? "w-5 h-5 mr-3" : "w-4 h-4 mr-2")} />
                        {t('common.rename')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSessionToDelete(session.id);
                          setDeleteDialogOpen(true);
                        }}
                        className={cn(
                          "text-destructive focus:text-destructive rounded-lg",
                          isMobile ? "text-base py-3" : "text-sm"
                        )}
                      >
                        <Trash2 className={cn(isMobile ? "w-5 h-5 mr-3" : "w-4 h-4 mr-2")} />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className={cn(
        "border-t border-border/50 bg-gradient-to-t from-chat-sidebar/50 to-transparent",
        isMobile ? "p-4" : "p-3"
      )}>
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/settings')}
            className={cn(
              "w-full justify-start text-left hover:bg-chat-sidebar-hover/60 transition-all duration-200 rounded-xl",
              isMobile ? "h-12 text-base" : "h-10"
            )}
          >
            <Settings className={cn(isMobile ? "w-5 h-5 mr-4" : "w-4 h-4 mr-3")} />
            {t('sidebar.settings')}
          </Button>
          
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className={cn(
                "w-full justify-start text-left hover:bg-chat-sidebar-hover/60 transition-all duration-200 rounded-xl text-primary hover:text-primary",
                isMobile ? "h-12 text-base" : "h-10"
              )}
            >
              <Shield className={cn(isMobile ? "w-5 h-5 mr-4" : "w-4 h-4 mr-3")} />
              {user?.role === 'superadmin' ? t('sidebar.superAdminPanel') : t('sidebar.adminPanel')}
            </Button>
          )}
          
          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "w-full justify-start text-left hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl",
              isMobile ? "h-12 text-base" : "h-10"
            )}
          >
            <LogOut className={cn(isMobile ? "w-5 h-5 mr-4" : "w-4 h-4 mr-3")} />
            {t('sidebar.logout')}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('chat.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('chat.deleteSessionConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSessionToDelete(null);
            }}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatSidebar;