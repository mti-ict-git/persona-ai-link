import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface OriginalTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
}

const OriginalTextModal: React.FC<OriginalTextModalProps> = ({
  isOpen,
  onClose,
  originalText
}) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Helper function to extract and format the original text
  const formatOriginalText = (text: string): string => {
    console.log('=== OriginalTextModal Debug ===');
    console.log('Raw text:', text);
    console.log('Text type:', typeof text);
    
    if (!text || !text.trim()) {
      return t('originalText.noDataAvailable') || 'No original text available.';
    }

    // First, try to extract content from JSON if it's JSON
    let extractedContent = text;
    
    try {
      const parsed = JSON.parse(text);
      console.log('Parsed JSON:', parsed);
      
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Extract the first item's content
        const firstItem = parsed[0];
        if (typeof firstItem === 'string') {
          extractedContent = firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          extractedContent = firstItem.content || firstItem.text || firstItem.original_retrieved_text || text;
        }
      } else if (parsed && typeof parsed === 'object') {
        extractedContent = parsed.content || parsed.text || parsed.original_retrieved_text || text;
      }
    } catch (error) {
      console.log('JSON parsing failed, using raw text:', error);
      // Use the original text if JSON parsing fails
    }
    
    console.log('Extracted content:', extractedContent);
    console.log('Content includes |:', extractedContent.includes('|'));
    console.log('Content includes ---:', extractedContent.includes('---'));
    
    // Clean up HTML tags and normalize markdown table format
    const cleanedContent = extractedContent
      // First handle escaped quotes
      .replace(/\\"/g, '"')
      // Replace <br> tags with newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove span tags with language attributes
      .replace(/<span[^>]*lang[^>]*>/gi, '')
      .replace(/<\/span>/gi, '')
      // Clean up other HTML tags
      .replace(/<[^>]+>/g, '')
      // Fix table structure - ensure proper markdown table format
      .replace(/\|\s*JENIS SHIFT[^|]*\|[^\n]*\n/g, '') // Remove header duplicates
      .replace(/\|\s*---[^\n]*\n/g, '| --- | --- | --- | --- |\n') // Fix separator row
      // Normalize table separators
      .replace(/\s*\|\s*/g, ' | ')
      // Clean up multiple newlines
      .replace(/\n\s*\n/g, '\n\n')
      // Remove extra whitespace
      .trim();
    
    console.log('Cleaned content:', cleanedContent);
    
    // Return the cleaned content to preserve markdown formatting
    return cleanedContent;
  };

  const formattedText = formatOriginalText(originalText);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-h-[80vh] overflow-hidden flex flex-col",
        isMobile ? "max-w-[95vw]" : "max-w-4xl"
      )}>
        <DialogHeader>
          <DialogTitle>{t('originalText.title') || 'Original Source Text'}</DialogTitle>
          <DialogDescription>
            {t('originalText.description') || 'This is the original text retrieved from the knowledge base that was used to generate the response.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-foreground">{children}</h3>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-sm">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="mb-3 p-3 rounded-lg bg-muted overflow-x-auto">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground mb-3">
                    {children}
                  </blockquote>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-foreground">{children}</li>,
                hr: () => <hr className="my-4 border-border" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-3">
                    <table className="min-w-full border-collapse border border-border">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                th: ({ children }) => (
                  <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-foreground">
                    {children}
                  </td>
                ),
              }}
            >
              {formattedText}
            </ReactMarkdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OriginalTextModal;