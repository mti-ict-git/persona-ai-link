import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
  isMarkdown?: boolean;
  className?: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = Number(import.meta.env.VITE_TYPEWRITER_SPEED) || 30,
  onComplete,
  isMarkdown = false,
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Check if typewriter animation is enabled from environment
  const isTypewriterEnabled = import.meta.env.VITE_TYPEWRITER_ENABLED === 'true';

  useEffect(() => {
    if (!isTypewriterEnabled) {
      // If typewriter is disabled, show full text immediately
      setDisplayedText(text);
      setCurrentIndex(text.length);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, isComplete, isTypewriterEnabled]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  if (isMarkdown) {
    return (
      <div className={className}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Customize markdown components for better styling
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-foreground">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-foreground">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/30 pl-4 py-2 mb-3 bg-muted/30 rounded-r-lg italic">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              ) : (
                <code className={`block bg-muted/80 p-3 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre ${className}`}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <pre className="mb-3 overflow-x-auto">{children}</pre>,
            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ children, href }) => (
              <a 
                href={href} 
                className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            table: ({ children }) => (
              <table className="border-collapse border border-border/50 mb-3 rounded-lg overflow-hidden">
                {children}
              </table>
            ),
            th: ({ children }) => (
              <th className="border border-border/50 px-3 py-2 bg-muted/60 font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border/50 px-3 py-2">
                {children}
              </td>
            ),
          }}
        >
          {displayedText}
        </ReactMarkdown>
        {!isComplete && isTypewriterEnabled && (
          <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="whitespace-pre-wrap leading-relaxed">
        {displayedText}
        {!isComplete && isTypewriterEnabled && (
          <span className="inline-block w-2 h-5 bg-primary animate-pulse ml-1" />
        )}
      </p>
    </div>
  );
};

export default TypewriterText;