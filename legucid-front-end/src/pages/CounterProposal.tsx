import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Info, FileText, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import BackNavigation from '@/components/BackNavigation';
import { Footer } from '@/components/ui/footer';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';

interface Clause {
  title: string;
  risk: 'high' | 'medium' | 'low';
  summary: string;
  impact: string;
  fullText: string;
  marketComparison: string;
  recommendations: string[];
  riskDetails: string;
}

const CounterProposal: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { analysisData, isLoading } = useDocumentAnalysis();
  const [selectedClauses, setSelectedClauses] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<string>('');
  const [showProposal, setShowProposal] = useState(false);

  // Convert backend data to our Clause format
  const convertBackendDataToClauses = (): Clause[] => {
    if (!analysisData?.risk_assessment?.clause_assessments) {
      return [];
    }

    return analysisData.risk_assessment.clause_assessments.map((clause: any, index: number) => ({
      title: `Clause ${index + 1}`,
      risk: clause.risk_level as 'high' | 'medium' | 'low',
      summary: clause.clause_text?.substring(0, 150) + '...' || 'No summary available',
      impact: clause.reasoning || 'No impact details available',
      fullText: clause.clause_text || 'No full text available',
      marketComparison: 'Market comparison not available from backend',
      recommendations: clause.potential_issues || ['No specific recommendations available'],
      riskDetails: clause.reasoning || 'No risk details available'
    }));
  };

  // Get clauses from backend data and filter for high/medium risk only
  const allClauses = convertBackendDataToClauses();
  const clauses = allClauses.filter(clause => clause.risk === 'high' || clause.risk === 'medium');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium': return <Info className="h-5 w-5 text-yellow-600" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 border-red-200';
      case 'medium': return 'bg-yellow-100 border-yellow-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const toggleClauseSelection = (index: number) => {
    const newSelection = new Set(selectedClauses);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedClauses(newSelection);
  };

  const generateCounterProposal = async () => {
    if (selectedClauses.size === 0) {
      toast({
        title: 'No clauses selected',
        description: 'Please select at least one clause to generate a counter proposal.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI generation - in real app, this would call an API
    setTimeout(() => {
      const selectedClauseData = Array.from(selectedClauses).map(index => clauses[index]);
      
      const proposal = `COUNTER PROPOSAL

Dear [Counterparty Name],

Thank you for sharing the proposed agreement. After careful review, I'd like to propose amendments to the following clauses to ensure a more balanced and mutually beneficial arrangement:

${selectedClauseData.map((clause, idx) => `
${idx + 1}. ${clause.title.toUpperCase()}

Current Issue:
${clause.summary}

Proposed Amendment:
${clause.recommendations.slice(0, 2).map(rec => `• ${rec}`).join('\n')}

Rationale:
${clause.marketComparison}
`).join('\n')}

These amendments align with industry best practices and create a more equitable agreement that protects both parties' interests while maintaining the commercial viability of our partnership.

I'm happy to discuss any of these proposals in detail and explore alternative approaches that address your concerns.

Best regards,
[Your Name]

---
Generated on: ${new Date().toLocaleDateString()}
Total clauses reviewed: ${selectedClauseData.length}
Risk level: ${selectedClauseData.some(c => c.risk === 'high') ? 'High' : 'Medium'}`;

      setGeneratedProposal(proposal);
      setShowProposal(true);
      setIsGenerating(false);
    }, 3000);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedProposal);
      toast({
        title: 'Copied!',
        description: 'Counter proposal copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackNavigation />
              <div 
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/dashboard')}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">⚖</span>
                </div>
                <span className="text-xl font-bold text-gray-900">Legucid</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Negotiate</h1>
          <p className="text-gray-600">Select high and medium risk clauses to generate a comprehensive negotiating offer</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading document analysis...</p>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !analysisData && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Document Analysis Available</h3>
            <p className="text-gray-600 mb-6">Please upload and analyze a document first to access negotiation features.</p>
            <Button onClick={() => navigate('/')} className="bg-blue-600 hover:bg-blue-700">
              Upload Document
            </Button>
          </div>
        )}

        {/* No High/Medium Risk Clauses */}
        {!isLoading && analysisData && clauses.length === 0 && (
          <div className="text-center py-12">
            <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No High or Medium Risk Clauses Found</h3>
            <p className="text-gray-600 mb-6">Great news! Your document doesn't contain any high or medium risk clauses that require negotiation.</p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Main Content - Only show when we have data and not loading */}
        {!isLoading && analysisData && clauses.length > 0 && (
          <>
            {!showProposal ? (
              <>
                {/* Selection Summary */}
                <Card className="mb-8 p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Selected Clauses</h3>
                      <p className="text-gray-600">
                        {selectedClauses.size === 0 
                          ? 'No clauses selected yet' 
                          : `${selectedClauses.size} clause${selectedClauses.size !== 1 ? 's' : ''} selected`
                        }
                      </p>
                    </div>
                    <Button 
                      onClick={generateCounterProposal}
                      disabled={selectedClauses.size === 0 || isGenerating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Generate Negotiation Proposal
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {/* High and Medium Risk Clauses */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">High & Medium Risk Clauses</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {clauses.map((clause, index) => (
                      <Card 
                        key={index} 
                        className={`p-4 cursor-pointer transition-all border-2 ${
                          selectedClauses.has(index) 
                            ? 'border-blue-500 bg-blue-50' 
                            : getRiskColor(clause.risk)
                        }`}
                        onClick={() => toggleClauseSelection(index)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getRiskIcon(clause.risk)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(clause.risk)} text-white`}>
                              {clause.risk.toUpperCase()} RISK
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedClauses.has(index) && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                            <span className="text-gray-400">→</span>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2">{clause.title}</h3>
                        <p className="text-sm text-gray-700 mb-2">{clause.summary}</p>
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-l-4 border-red-400 dark:border-red-500 rounded-lg p-3 mt-2 shadow-sm hover:shadow-md transition-all duration-300 group">
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200"></div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 leading-relaxed">{clause.impact}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            ) : (
          /* Generated Counter Proposal */
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Generated Counter Proposal</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copyToClipboard}>
                    <FileText className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowProposal(false);
                      setGeneratedProposal('');
                    }}
                    variant="outline"
                  >
                    Generate New
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 border rounded-lg p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                  {generatedProposal}
                </pre>
              </div>
            </Card>
          </div>
        )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <Footer className="mt-16" />
    </div>
  );
};

export default CounterProposal; 