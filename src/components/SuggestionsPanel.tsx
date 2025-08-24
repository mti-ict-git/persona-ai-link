import { Button } from "@/components/ui/button";
import { RefreshCw, Users, FileText, Gift, Shield, UserCheck, Calendar } from "lucide-react";

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
      title: "Kebijakan Golongan & Jabatan",
      description: "Berikan informasi tentang struktur golongan dan kebijakan jabatan di perusahaan",
      icon: <Users className="w-5 h-5" />,
      prompt: "Can you provide information about employee grade structure and position policies in the company?"
    },
    {
      id: "2", 
      title: "Peraturan Perusahaan",
      description: "Bagaimana aturan dan regulasi yang berlaku di perusahaan ini",
      icon: <FileText className="w-5 h-5" />,
      prompt: "What are the company rules and regulations that apply to all employees?"
    },
    {
      id: "3",
      title: "Employee Benefits",
      description: "Informasi lengkap mengenai benefit dan tunjangan karyawan",
      icon: <Gift className="w-5 h-5" />,
      prompt: "Can you provide complete information about employee benefits and allowances?"
    },
    {
      id: "4",
      title: "IT Policy",
      description: "Kebijakan penggunaan teknologi informasi dan keamanan data",
      icon: <Shield className="w-5 h-5" />,
      prompt: "What are the IT policies regarding technology usage and data security?"
    },
    {
      id: "5",
      title: "Leave Policy",
      description: "Aturan cuti dan prosedur pengajuan izin kerja",
      icon: <Calendar className="w-5 h-5" />,
      prompt: "What are the leave policies and procedures for requesting time off?"
    },
    {
      id: "6",
      title: "Performance Review",
      description: "Sistem evaluasi kinerja dan penilaian karyawan",
      icon: <UserCheck className="w-5 h-5" />,
      prompt: "How does the performance review and employee evaluation system work?"
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