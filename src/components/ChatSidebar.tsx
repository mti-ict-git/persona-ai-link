import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MessageCircle, MoreHorizontal, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  isActive?: boolean;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  activeSessionId?: string;
}

const ChatSidebar = ({ sessions, onSessionSelect, onNewChat, activeSessionId }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={cn(
                  "w-full p-3 text-left rounded-lg mb-1 group hover:bg-chat-sidebar-hover transition-all duration-200",
                  activeSessionId === session.id && "bg-chat-sidebar-active border border-primary/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {session.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.timestamp}
                    </p>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
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
    </div>
  );
};

export default ChatSidebar;