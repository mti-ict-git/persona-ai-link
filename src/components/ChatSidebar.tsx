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
import { Search, Plus, MessageCircle, MoreHorizontal, LogOut, Trash2, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const ChatSidebar = ({ sessions, onSessionSelect, onNewChat, onDeleteSession, onRenameSession, activeSessionId }: ChatSidebarProps) => {
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
    <div className="w-80 bg-chat-sidebar border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Insight</h1>
            <p className="text-xs text-muted-foreground">Intelligent Assistant</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>
        
        {/* New Chat Button */}
        <Button 
          onClick={onNewChat}
          className="w-full mt-3 bg-gradient-primary hover:shadow-elegant transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <h3 className="text-sm font-medium text-muted-foreground px-3 py-2">Today</h3>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "w-full p-3 rounded-lg mb-1 group hover:bg-chat-sidebar-hover transition-all duration-200 relative",
                  activeSessionId === session.id && "bg-chat-sidebar-active border border-primary/20"
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
                          className="text-sm h-8 flex-1"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveRename}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelRename}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.timestamp}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSessionSelect(session.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {session.session_name || session.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {session.timestamp}
                      </p>
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStartRename(session.id, session.session_name || session.title)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSessionToDelete(session.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
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

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-primary-foreground">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">User</p>
            <p className="text-xs text-muted-foreground">AI Assistant User</p>
          </div>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4" />
          </Button>
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