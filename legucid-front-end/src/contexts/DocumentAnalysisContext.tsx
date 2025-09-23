import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DocumentAnalysisData } from '@/types/documentAnalysis';

interface DocumentAnalysisContextType {
  analysisData: DocumentAnalysisData | null;
  setAnalysisData: (data: DocumentAnalysisData | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DocumentAnalysisContext = createContext<DocumentAnalysisContextType | undefined>(undefined);

export const useDocumentAnalysis = () => {
  const context = useContext(DocumentAnalysisContext);
  if (context === undefined) {
    throw new Error('useDocumentAnalysis must be used within a DocumentAnalysisProvider');
  }
  return context;
};

interface DocumentAnalysisProviderProps {
  children: ReactNode;
}

export const DocumentAnalysisProvider: React.FC<DocumentAnalysisProviderProps> = ({ children }) => {
  const [analysisData, setAnalysisData] = useState<DocumentAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging for context
  console.log('=== DOCUMENT ANALYSIS CONTEXT ===');
  console.log('Current analysis data:', analysisData);
  console.log('Is loading:', isLoading);

  const value = {
    analysisData,
    setAnalysisData: (data: DocumentAnalysisData | null) => {
      console.log('=== SETTING ANALYSIS DATA IN CONTEXT ===');
      console.log('New data:', data);
      setAnalysisData(data);
    },
    isLoading,
    setIsLoading,
  };

  return (
    <DocumentAnalysisContext.Provider value={value}>
      {children}
    </DocumentAnalysisContext.Provider>
  );
};