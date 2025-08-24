import React from 'react';
import { cn } from '@/lib/utils';

interface TypingAnimationProps {
  className?: string;
}

const TypingAnimation: React.FC<TypingAnimationProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center space-x-1 p-4", className)}>
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm text-muted-foreground ml-2">AI is typing...</span>
    </div>
  );
};

export default TypingAnimation;