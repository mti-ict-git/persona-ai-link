import { Button } from "@/components/ui/button";
import { RefreshCw, Lightbulb, AlertTriangle, List, Code } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

interface SuggestionsPanelProps {
  onSuggestionSelect: (prompt: string) => void;
}

const SuggestionsPanel = ({ onSuggestionSelect }: SuggestionsPanelProps) => {
  const suggestions: Suggestion[] = [
    {
      id: "1",
      title: "Inspection",
      description: "Berikan poin inspeksi rutin dari mesin rotary kiln",
      icon: <Lightbulb className="w-5 h-5" />,
      prompt: "Can you provide routine inspection points for rotary kiln machines?"
    },
    {
      id: "2", 
      title: "Troubleshooting",
      description: "Bagaimana cara troubleshoot alarm yang ada di mesin ball mill",
      icon: <AlertTriangle className="w-5 h-5" />,
      prompt: "How to troubleshoot alarms that occur in ball mill machines?"
    },
    {
      id: "3",
      title: "Sparepart List",
      description: "Berikan saya list sparepart dari mesin Ball mill",
      icon: <List className="w-5 h-5" />,
      prompt: "Can you provide a spare parts list for ball mill machines?"
    },
    {
      id: "4",
      title: "Alarm Code",
      description: "Ada apa saja jenis alarm tahh",
      icon: <Code className="w-5 h-5" />,
      prompt: "What are the different types of alarm codes and their meanings?"
    }
  ];

  return (
    <div className="w-80 bg-chat-suggestions border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Prompt Suggestion</h3>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 p-4 space-y-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onSuggestionSelect(suggestion.prompt)}
            className="w-full p-4 text-left bg-card border border-border rounded-xl hover:shadow-card hover:border-primary/20 transition-all duration-300 group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {suggestion.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                    {suggestion.id}
                  </span>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {suggestion.title}
                  </h4>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {suggestion.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-3">
            Click any suggestion to start a conversation
          </p>
          <Button variant="outline" size="sm" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Suggestions
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionsPanel;