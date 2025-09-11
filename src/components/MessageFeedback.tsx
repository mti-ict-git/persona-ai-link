import React, { useMemo, useState } from 'react';
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
import { ThumbsUp, ThumbsDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageFeedbackProps {
  messageId: string;
  messageContent: string;
  sessionId: string;
  previousQuestion?: string;
  className?: string;
  originalText?: string;
}

type FeedbackType = 'positive' | 'negative' | null;

// Interface for parsed content objects
interface ParsedContent {
  content?: string;
  text?: string;
  original_retrieved_text?: string;
  [key: string]: unknown;
}

/**
 * Table-safe Markdown normalizer
 * - Extracts text if JSON-encoded
 * - Converts HTML <a> to [text](url) and strips other tags
 * - Dedents common leading spaces (avoid code block)
 * - Repairs wrapped GFM table rows by joining lines until '|' count matches header
 * - Ensures blank lines before/after tables for GFM parsing
 */
const formatOriginalText = (text: string): string => {
  const t = (s: unknown) => (s ?? '').toString();

  // 1) Extract content if JSON-ish
  let raw = t(text).trim();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (typeof first === 'string') raw = first;
      else if (first && typeof first === 'object') {
        const firstContent = first as ParsedContent;
        raw = t(firstContent.content || firstContent.text || firstContent.original_retrieved_text || raw);
      }
    } else if (parsed && typeof parsed === 'object') {
      const parsedContent = parsed as ParsedContent;
      raw = t(parsedContent.content || parsedContent.text || parsedContent.original_retrieved_text || raw);
    }
  } catch {
    /* not JSON – keep raw */
  }

  // 2) Basic normalize & HTML handling
  raw = raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')              // nbsp -> space
    .replace(/<br\s*\/?>/gi, '\n');

  // Convert <a href="...">text</a> -> [text](url)
  raw = raw.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi,
    (_m, href, inner) => `[${inner}](${href})`
  );

  // Strip leftover HTML tags
  raw = raw.replace(/<\/?[^>]+>/g, '');

  // 3) Trim trailing spaces per line
  let lines = raw.split('\n').map(l => l.replace(/\s+$/g, ''));

  // 4) Dedent to avoid accidental code blocks on GFM
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const commonIndent = nonEmpty.length
    ? Math.min(...nonEmpty.map(l => (l.match(/^ +/)?.[0].length ?? 0)))
    : 0;
  if (commonIndent > 0) {
    const pad = ' '.repeat(commonIndent);
    lines = lines.map(l => (l.startsWith(pad) ? l.slice(commonIndent) : l));
  }

  // 5) Repair wrapped table rows & ensure blank lines around tables
  const fixed: string[] = [];
  let i = 0;

  const isTableLine = (s: string) => /^\s*\|.*\|\s*$/.test(s);

  while (i < lines.length) {
    const line = lines[i];

    if (!isTableLine(line.trim())) {
      fixed.push(line);
      i++;
      continue;
    }

    // Collect this table block
    const start = i;
    while (i < lines.length && isTableLine(lines[i].trim())) i++;
    const block = lines.slice(start, i);

    // Ensure blank line before table to terminate previous paragraph/list
    if (fixed.length && fixed[fixed.length - 1].trim() !== '') fixed.push('');

    // Expected '|' count determined by header row
    const expectedPipes = (block[0].match(/\|/g) || []).length;

    const repaired: string[] = [];
    let buf = '';

    const flush = () => {
      if (buf) {
        repaired.push(buf);
        buf = '';
      }
    };

    for (let r = 0; r < block.length; r++) {
      const candidate = (buf ? buf + ' ' : '') + block[r];
      const pipeCount = (candidate.match(/\|/g) || []).length;

      // If short, keep buffering until it meets/exceeds expected pipes.
      if (pipeCount < expectedPipes && r < block.length - 1) {
        buf = candidate;
        continue;
      }

      buf = candidate;
      flush();
    }

    fixed.push(...repaired);

    // Blank line after table
    if (i < lines.length && lines[i]?.trim() !== '') fixed.push('');
  }

  // 6) Final tidy: collapse extra blank lines
  const out = fixed
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
};

const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  messageContent,
  sessionId,
  previousQuestion,
  className = '',
  originalText = ''
}) => {
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [showModal, setShowModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const formattedOriginal = useMemo(() => {
    const cleaned = formatOriginalText(originalText);
    return cleaned && cleaned.trim().length > 0
      ? cleaned
      : (t('originalText.noDataAvailable') || 'No original text available.');
  }, [originalText, t]);

  const handlePositiveFeedback = async () => {
    try {
      await submitFeedback('positive', '');
      setFeedback('positive');
      toast({
        title: t('feedback.thankYou'),
        description: t('feedback.positiveFeedbackRecorded'),
      });
    } catch (error) {
      console.error('Failed to submit positive feedback:', error);
      toast({
        title: t('common.error'),
        description: t('feedback.submitError'),
        variant: 'destructive',
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
      await apiService.submitMessageFeedback({
        messageId,
        sessionId,
        feedbackType: type,
        comment,
        messageContent: messageContent.substring(0, 500), // truncate for storage
        previousQuestion: previousQuestion || '',
        timestamp: new Date().toISOString(),
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
        title: t('feedback.thankYou'),
        description: t('feedback.feedbackRecorded'),
      });
    } catch (error) {
      console.error('Failed to submit negative feedback:', error);
      toast({
        title: t('common.error'),
        description: t('feedback.submitError'),
        variant: 'destructive',
      });
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setFeedbackText('');
  };

  return (
    <>
      <div className={cn('flex items-center gap-1 mt-2', className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePositiveFeedback}
          disabled={feedback !== null}
          className={cn(
            'h-7 w-7 p-0 rounded-full transition-all duration-200',
            feedback === 'positive'
              ? 'bg-green-100 text-green-600 hover:bg-green-100'
              : 'hover:bg-muted/80 text-muted-foreground hover:text-green-600'
          )}
          aria-label={t('feedback.like') || 'Like'}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNegativeFeedback}
          disabled={feedback !== null}
          className={cn(
            'h-7 w-7 p-0 rounded-full transition-all duration-200',
            feedback === 'negative'
              ? 'bg-red-100 text-red-600 hover:bg-red-100'
              : 'hover:bg-muted/80 text-muted-foreground hover:text-red-600'
          )}
          aria-label={t('feedback.dislike') || 'Dislike'}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </Button>

        {originalText && originalText.trim() && (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full transition-all duration-200 hover:bg-muted/80 text-muted-foreground hover:text-blue-600 cursor-help"
                  aria-label={t('originalText.viewOriginalText') || 'View original source text'}
                  title={t('originalText.viewOriginalText') || 'View original source text'}
                >
                  <Info className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                // Try "right" if you prefer it to pop beside the button:
                // side="right" align="start"
                side="bottom"
                align="start"
                sideOffset={8}

                // Keep away from left edge (set to your sidebar width + a little padding)
                avoidCollisions
                collisionPadding={{ left: 280, right: 16, top: 16, bottom: 16 }} // <-- adjust 280 to your sidebar width

                // Ensure it sits above the sidebar
                className={cn(
                  'prose prose-sm dark:prose-invert',
                  'w-auto min-w-[500px] max-w-[800px] max-h-96 overflow-y-auto',
                  'p-4 z-[1000] bg-popover border border-border shadow-lg'
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    skipHtml
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-base font-bold mb-2 text-foreground">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm font-semibold mb-1 text-foreground">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-medium mb-1 text-foreground">{children}</h3>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                      code: ({ children }) => (
                        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto text-foreground">
                          {children}
                        </pre>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => <li className="text-foreground">{children}</li>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto mb-2">
                          <table className="border-collapse border border-border text-xs w-full table-auto">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => (
                        <tr className="border-b border-border">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border px-2 py-1 text-left font-semibold text-foreground">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border px-2 py-1 text-foreground">
                          {children}
                        </td>
                      ),
                    }}
                  >
                    {formattedOriginal}
                  </ReactMarkdown>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {feedback && (
          <span className="text-xs text-muted-foreground ml-2">
            {feedback === 'positive'
              ? t('feedback.thanksForFeedback')
              : t('feedback.feedbackSubmitted')}
          </span>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('feedback.helpUsImprove')}</DialogTitle>
            <DialogDescription>{t('feedback.sorryNotHelpful')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="feedback-text">{t('feedback.whatWentWrong')}</Label>
              <Textarea
                id="feedback-text"
                placeholder={t('feedback.describeProblem')}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleModalCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleModalSubmit} disabled={isSubmitting || !feedbackText.trim()}>
              {isSubmitting ? t('feedback.submitting') : t('feedback.submitFeedback')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageFeedback;
