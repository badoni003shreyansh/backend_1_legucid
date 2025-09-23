import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DocumentAnalysisProvider } from "@/contexts/DocumentAnalysisContext";
import { PageTransitionProvider, usePageTransition } from "@/contexts/PageTransitionContext";
import { PageTransitionLoader } from "@/components/ui/page-transition-loader";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CounterProposal from "./pages/CounterProposal";
import DetailedDocumentAnalysis from "./pages/DetailedDocumentAnalysis";
import AudioDecipher from "./pages/AudioDecipher";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isTransitioning, transitionMessage } = usePageTransition();

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/counter-proposal" element={<CounterProposal />} />
        <Route path="/detailed-analysis" element={<DetailedDocumentAnalysis />} />
        <Route path="/audio-decipher" element={<AudioDecipher />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PageTransitionLoader isVisible={isTransitioning} message={transitionMessage} />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DocumentAnalysisProvider>
        <PageTransitionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </PageTransitionProvider>
      </DocumentAnalysisProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
