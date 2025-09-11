import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface RetrievedTextTooltipProps {
  messageContent: string;
  children: React.ReactNode;
  originalRetrievedText?: string | null;
}

interface RetrievedData {
  url: string;
  original_retrieved_text: string;
  filename: string;
  referenceNumber: number;
}

const RetrievedTextTooltip: React.FC<RetrievedTextTooltipProps> = ({ 
  messageContent, 
  children,
  originalRetrievedText 
}) => {
  
  console.log('=== RETRIEVED TEXT TOOLTIP DEBUG ===');
  console.log('messageContent:', messageContent);
  console.log('originalRetrievedText:', originalRetrievedText);
  console.log('originalRetrievedText type:', typeof originalRetrievedText);
  console.log('=====================================');

  // Function to extract retrieved data from original retrieved text only
  const extractRetrievedData = (messageContent: string, retrievedText?: string | null): RetrievedData[] => {
    console.log('===================================');
    console.log('extractRetrievedData called with:');
    console.log('messageContent:', messageContent);
    console.log('retrievedText:', retrievedText);
    
    try {
      const results: RetrievedData[] = [];
      
      // Only process if we have retrieved text
      if (!retrievedText) {
        console.log('No retrieved text available');
        console.log('===================================');
        return results;
      }
      
      let parsedRetrievedData: { content?: string; text?: string; original_retrieved_text?: string; [key: string]: unknown }[] = [];
      
      try {
        // Try to parse as JSON array first
        parsedRetrievedData = JSON.parse(retrievedText);
        console.log('Successfully parsed retrieved text as JSON:', parsedRetrievedData);
      } catch (parseError) {
        // If not JSON, treat as single text block
        console.log('Failed to parse as JSON, treating as single text block. Error:', parseError);
        parsedRetrievedData = [{ content: retrievedText }];
        console.log('Created single text block:', parsedRetrievedData);
      }
      
      // Create results from parsed data without reference numbers
      parsedRetrievedData.forEach((sourceData, index) => {
        // Avoid duplicating nested original_retrieved_text
        let sourceContent;
        if (sourceData.original_retrieved_text && typeof sourceData.original_retrieved_text === 'string') {
          sourceContent = sourceData.original_retrieved_text;
        } else {
          sourceContent = sourceData.content || sourceData.text || retrievedText;
        }
        
        console.log(`Source ${index + 1}:`, sourceData);
        console.log(`Source content for ${index + 1}:`, sourceContent);
        
        const resultItem = {
          url: '', // No URL available
          original_retrieved_text: sourceContent,
          filename: `Source ${index + 1}`,
          referenceNumber: index + 1
        };
        
        console.log(`Result item for source ${index + 1}:`, resultItem);
        
        results.push(resultItem);
      });

      console.log('Final results from extractRetrievedData:', results);
      console.log('Results length:', results.length);
      console.log('===================================');
      
      return results;
    } catch (error) {
      console.error('Error parsing retrieved data:', error);
      return [];
    }
  };

  const extractFilenameFromUrl = (url: string): string => {
    try {
      // Extract filename from SharePoint URL
      const match = url.match(/([^/]+\.(?:pdf|doc|docx|txt|md|csv|xlsx|xls|ppt|pptx))/i);
      if (match) {
        return decodeURIComponent(match[1]);
      }
      return 'Document';
    } catch {
      return 'Document';
    }
  };

  const retrievedDataList = extractRetrievedData(messageContent, originalRetrievedText);

  if (retrievedDataList.length === 0) {
    return <>{children}</>;
  }

  // Enhanced content with tooltips for retrieved text
  const enhanceContentWithTooltips = (content: React.ReactNode): React.ReactNode => {
    if (typeof content !== 'string') {
      return content;
    }

    // Look for patterns that might indicate reference content
    const hasReferences = retrievedDataList.length > 0;
    
    if (!hasReferences) {
      return content;
    }

    // For now, wrap the entire content with a tooltip showing the first retrieved text
    const firstRetrieved = retrievedDataList[0];
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help border-b border-dotted border-primary/50 hover:border-primary transition-colors">
              {content}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-md p-4 bg-popover border border-border shadow-lg">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-sm">{children}</p>,
                  h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-semibold mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-border text-xs">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                  th: ({ children }) => (
                    <th className="border border-border px-2 py-1 text-left font-semibold text-xs">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-2 py-1 text-xs">
                      {children}
                    </td>
                  ),
                }}
              >
                {firstRetrieved.original_retrieved_text}
              </ReactMarkdown>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Return enhanced content with tooltips
  return <>{enhanceContentWithTooltips(children)}</>;
};

export default RetrievedTextTooltip;