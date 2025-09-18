import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, ThumbsUp, ThumbsDown, Bug, Lightbulb, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from 'react-i18next';

interface AppFeedbackProps {
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type FeedbackType = 'positive' | 'negative';
type FeedbackCategory = 'general' | 'bug_report' | 'feature_request' | 'ui_ux' | 'performance';

const AppFeedback: React.FC<AppFeedbackProps> = ({ className, open = false, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use external control if provided, otherwise use internal state
  const dialogOpen = onOpenChange ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('positive');
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { currentLanguage } = useLanguage();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast({
        title: t('feedback.error'),
        description: t('feedback.commentRequired'),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate a unique feedback ID for app feedback
      const feedbackId = `app_feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use the existing feedback API endpoint
      await apiService.submitFeedback({
        messageId: feedbackId,
        sessionId: 'app_feedback_session', // Special session ID for app feedback
        feedbackType,
        comment: `[${category.toUpperCase()}] ${comment}`,
        messageContent: `App Feedback - Category: ${category}`,
        // No previousQuestion for app feedback
      });

      toast({
        title: t('feedback.success'),
        description: t('feedback.thankYou'),
      });

      // Reset form
      setComment('');
      setCategory('general');
      setFeedbackType('positive');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error submitting app feedback:', error);
      toast({
        title: t('feedback.error'),
        description: t('feedback.submitError'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: FeedbackCategory) => {
    switch (cat) {
      case 'bug_report': return <Bug className="w-4 h-4" />;
      case 'feature_request': return <Lightbulb className="w-4 h-4" />;
      case 'ui_ux': return <Star className="w-4 h-4" />;
      case 'performance': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {/* Only render DialogTrigger when not in controlled mode */}
      {!onOpenChange && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-left hover:bg-accent/50 transition-all duration-200 rounded-xl",
              isMobile ? "h-12 text-base" : "h-10",
              className
            )}
          >
            <MessageSquare className={cn(isMobile ? "w-5 h-5 mr-4" : "w-4 h-4 mr-3")} />
            {t('feedback.sendFeedback')}
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className={cn("sm:max-w-md", isMobile && "mx-4")}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('feedback.appFeedbackTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('feedback.appFeedbackDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>{t('feedback.type')}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={feedbackType === 'positive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackType('positive')}
                className="flex-1"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                {t('feedback.positive')}
              </Button>
              <Button
                type="button"
                variant={feedbackType === 'negative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedbackType('negative')}
                className="flex-1"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                {t('feedback.negative')}
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t('feedback.category')}</Label>
            <Select value={category} onValueChange={(value: FeedbackCategory) => setCategory(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('feedback.categories.general')}
                  </div>
                </SelectItem>
                <SelectItem value="bug_report">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    {t('feedback.categories.bugReport')}
                  </div>
                </SelectItem>
                <SelectItem value="feature_request">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    {t('feedback.categories.featureRequest')}
                  </div>
                </SelectItem>
                <SelectItem value="ui_ux">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {t('feedback.categories.uiUx')}
                  </div>
                </SelectItem>
                <SelectItem value="performance">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('feedback.categories.performance')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="feedback-comment">{t('feedback.comment')}</Label>
            <Textarea
              id="feedback-comment"
              placeholder={t('feedback.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDialogOpen(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t('feedback.submitting') : t('feedback.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppFeedback;