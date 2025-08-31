import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';

interface MessageFeedbackProps {
  messageId: string;
  messageContent: string;
  sessionId: string;
  className?: string;
}

type FeedbackType = 'positive' | 'negative' | null;

const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  messageContent,
  sessionId,
  className = ''
}) => {
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [showModal, setShowModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handlePositiveFeedback = async () => {
    try {
      await submitFeedback('positive', '');
      setFeedback('positive');
      toast({
        title: "Thank you!",
        description: "Your positive feedback has been recorded.",
      });
    } catch (error) {
      console.error('Failed to submit positive feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNegativeFeedback = () => {
    setShowModal(true);
  };

  const submitFeedback = async (type: FeedbackType, comment: string) => {
    if (!type) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to submit feedback
      await apiService.submitMessageFeedback({
        messageId,
        sessionId,
        feedbackType: type,
        comment,
        messageContent: messageContent.substring(0, 500), // Truncate for storage
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalSubmit = async () => {
    try {
      await submitFeedback('negative', feedbackText);
      setFeedback('negative');
      setShowModal(false);
      setFeedbackText('');
      toast({
        title: "Thank you!",
        description: "Your feedback has been recorded and will help us improve.",
      });
    } catch (error) {
      console.error('Failed to submit negative feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setFeedbackText('');
  };

  return (
    <>
      <div className={cn("flex items-center gap-1 mt-2", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePositiveFeedback}
          disabled={feedback !== null}
          className={cn(
            "h-7 w-7 p-0 rounded-full transition-all duration-200",
            feedback === 'positive' 
              ? "bg-green-100 text-green-600 hover:bg-green-100" 
              : "hover:bg-muted/80 text-muted-foreground hover:text-green-600"
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNegativeFeedback}
          disabled={feedback !== null}
          className={cn(
            "h-7 w-7 p-0 rounded-full transition-all duration-200",
            feedback === 'negative' 
              ? "bg-red-100 text-red-600 hover:bg-red-100" 
              : "hover:bg-muted/80 text-muted-foreground hover:text-red-600"
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </Button>
        
        {feedback && (
          <span className="text-xs text-muted-foreground ml-2">
            {feedback === 'positive' ? 'Thanks for your feedback!' : 'Feedback submitted'}
          </span>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>
              We're sorry this response wasn't helpful. Please let us know how we can improve.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback-text">What went wrong?</Label>
              <Textarea
                id="feedback-text"
                placeholder="Please describe what was wrong with this response..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleModalCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={isSubmitting || !feedbackText.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageFeedback;