import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePageTransitionNavigation } from '@/hooks/use-page-transition';

interface BackNavigationProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
}

const BackNavigation: React.FC<BackNavigationProps> = ({ 
  className = '', 
  variant = 'ghost',
  size = 'sm'
}) => {
  const navigate = useNavigate();
  const { navigateWithTransition } = usePageTransitionNavigation();

  const handleBack = () => {
    // Always go to dashboard with transition for consistency
    navigateWithTransition('/dashboard', 'Loading...');
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleBack}
      className={`h-10 w-10 p-0 rounded-lg hover:bg-muted/80 transition-all duration-200 ${className}`}
    >
      <ArrowLeft className="h-5 w-5 text-foreground" />
    </Button>
  );
};

export default BackNavigation;