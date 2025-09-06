import { Button } from "@/components/ui/button";
import { RefreshCw, Users, FileText, Gift, Shield, UserCheck, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  
  const suggestions: Suggestion[] = [
    {
      id: "1",
      title: t('suggestions.companyStructure'),
      description: t('suggestions.companyStructure'),
      icon: <Users className="w-5 h-5" />,
      prompt: t('suggestions.companyStructurePrompt')
    },
    {
      id: "2", 
      title: t('suggestions.companyRegulations'),
      description: t('suggestions.rulesAndRegulations'),
      icon: <FileText className="w-5 h-5" />,
      prompt: t('suggestions.companyRegulationsPrompt')
    },
    {
      id: "3",
      title: t('suggestions.employeeBenefits'),
      description: t('suggestions.benefitsAndAllowances'),
      icon: <Gift className="w-5 h-5" />,
      prompt: t('suggestions.employeeBenefitsPrompt')
    },
    {
      id: "4",
      title: t('suggestions.itPolicy'),
      description: t('suggestions.itSecurityPolicy'),
      icon: <Shield className="w-5 h-5" />,
      prompt: t('suggestions.itPolicyPrompt')
    },
    {
      id: "5",
      title: t('suggestions.leavePolicy'),
      description: t('suggestions.leaveRulesAndProcedures'),
      icon: <Calendar className="w-5 h-5" />,
      prompt: t('suggestions.leavePolicyPrompt')
    },
    {
      id: "6",
      title: t('suggestions.performanceReview'),
      description: t('suggestions.performanceEvaluationSystem'),
      icon: <UserCheck className="w-5 h-5" />,
      prompt: t('suggestions.performanceReviewPrompt')
    }
  ];

  return (
    <div data-tour="suggestions-panel" className="w-80 bg-chat-suggestions border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">{t('suggestions.promptSuggestion')}</h3>
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
            {t('suggestions.clickToStart')}
          </p>
          <Button variant="outline" size="sm" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('suggestions.refreshSuggestions')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionsPanel;