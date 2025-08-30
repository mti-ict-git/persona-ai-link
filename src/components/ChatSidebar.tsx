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
import { Search, Plus, MessageCircle, MoreHorizontal, LogOut, Trash2, Edit2, Check, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

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
    <div className="w-80 bg-gradient-to-b from-chat-sidebar to-chat-sidebar/95 border-r border-border/50 flex flex-col h-full backdrop-blur-sm">
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-lg">Tsindeka AI</h1>
              <p className="text-xs text-muted-foreground/80 font-medium">MTI AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-9 w-9 rounded-xl hover:bg-muted/80 transition-all duration-200"
                title="Hide sidebar"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/80 border-border/60 rounded-xl backdrop-blur-sm hover:bg-background/90 transition-all duration-200 focus:bg-background"
          />
        </div>
        
        {/* New Chat Button */}
        <Button 
          onClick={onNewChat}
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-lg hover:scale-[1.02] transition-all duration-200 rounded-xl font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h3 className="text-sm font-semibold text-muted-foreground/80 px-3 py-3 uppercase tracking-wide">Recent Chats</h3>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs opacity-70 mt-1">Start a new chat to begin</p>
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
                          className="text-sm h-9 flex-1 rounded-lg bg-background/80 border-border/60"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveRename}
                          className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelRename}
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-2 font-medium">
                        {session.timestamp}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSessionSelect(session.id)}
                      className="flex-1 min-w-0 text-left group-hover:scale-[1.01] transition-transform duration-200"
                    >
                      <h4 className="text-sm font-semibold text-foreground truncate leading-relaxed">
                        {session.session_name || session.title}
                      </h4>
                      <p className="text-xs text-muted-foreground/70 mt-1 font-medium">
                        {session.timestamp}
                      </p>
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 h-9 w-9 p-0 rounded-lg hover:bg-muted/80"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-lg">
                      <DropdownMenuItem
                        onClick={() => handleStartRename(session.id, session.session_name || session.title)}
                        className="rounded-lg"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSessionToDelete(session.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>



      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone and will permanently remove all messages in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSessionToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatSidebar;