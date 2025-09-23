import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTransition } from '@/contexts/PageTransitionContext';

export const usePageTransitionNavigation = () => {
  const navigate = useNavigate();
  const { startTransition, endTransition } = usePageTransition();

  const navigateWithTransition = useCallback((
    to: string, 
    message: string = 'Loading...',
    delay: number = 800
  ) => {
    startTransition(message);
    
    // Simulate loading time for smooth transition
    setTimeout(() => {
      navigate(to);
      // Scroll to top after navigation
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      // End transition after navigation
      setTimeout(() => {
        endTransition();
      }, 200);
    }, delay);
  }, [navigate, startTransition, endTransition]);

  return { navigateWithTransition };
};