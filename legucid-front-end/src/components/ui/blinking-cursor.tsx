import React from 'react';
import { motion } from 'framer-motion';

interface BlinkingCursorProps {
  className?: string;
  text?: string;
}

export const BlinkingCursor: React.FC<BlinkingCursorProps> = ({ 
  className = '', 
  text = 'Ready to analyze your documents...' 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex items-center space-x-2 text-muted-foreground"
      >
        <span className="text-sm font-mono">{text}</span>
        <motion.div
          animate={{ opacity: [1, 0, 1] }}
          transition={{ 
            duration: 1.2, 
            repeat: Infinity, 
            ease: 'easeInOut' 
          }}
          className="w-0.5 h-4 bg-current"
        />
      </motion.div>
    </div>
  );
};