import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, AlertTriangle, Info, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { ClauseDetailModal } from '@/components/ClauseDetailModal';
import { RiskPieChart } from '@/components/ui/risk-pie-chart';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Footer } from '@/components/ui/footer';
import { useTheme } from '@/contexts/ThemeContext';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { usePageTransitionNavigation } from '@/hooks/use-page-transition';
import ChatbotModal from '@/components/ChatbotModal';
import BackNavigation from '@/components/BackNavigation';

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

const DetailedDocumentAnalysis: React.FC = () => {
  const navigate = useNavigate();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);
  const { actualTheme } = useTheme();
  const { analysisData, isLoading } = useDocumentAnalysis();
  const { navigateWithTransition } = usePageTransitionNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredClauses, setFilteredClauses] = useState<Clause[]>([]);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const
      }
    },
    hover: {
      y: -5,
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  // Convert backend data to Clause format
  const convertBackendDataToClauses = (): Clause[] => {
    console.log("Converting backend data to clauses. Analysis data:", analysisData);
    
    if (!analysisData?.risk_assessment) {
      console.log("No risk assessment found in analysis data");
      return [];
    }

    const riskAssessment = analysisData.risk_assessment as Record<string, unknown>;
    console.log("Risk assessment:", riskAssessment);

    // Check if clause_assessments exists in the risk_assessment
    const clauseAssessments = (riskAssessment.clause_assessments as Array<Record<string, unknown>>) || [];
    console.log("Clause assessments:", clauseAssessments);

    if (clauseAssessments.length === 0) {
      console.log("No clause assessments found");
      return [];
    }
    
    const convertedClauses = clauseAssessments.map((clause, index) => ({
      title: `Clause ${index + 1}`,
      risk: (clause.risk_level as 'high' | 'medium' | 'low') || 'medium',
      summary: (clause.reasoning as string) || 'No summary available',
      impact: (clause.potential_issues as string[])?.join(', ') || 'No impact details available',
      fullText: (clause.clause_text as string) || 'No full text available',
      marketComparison: "Analysis based on industry standards and best practices",
      recommendations: (riskAssessment.recommendations as string[]) || [],
      riskDetails: (clause.reasoning as string) || 'No risk details available'
    }));

    console.log("Converted clauses:", convertedClauses);
    return convertedClauses;
  };

  // Get clauses from backend data or fallback to sample data
  const clauses: Clause[] = analysisData ? convertBackendDataToClauses() : [
    {
      title: "No Document Analyzed",
      risk: "medium",
      summary: "Please upload a document to see detailed analysis",
      impact: "Upload a document to get started",
      fullText: "No document has been uploaded yet. Please go back to the dashboard and upload a document to see detailed analysis.",
      marketComparison: "Upload a document to see market comparison",
      recommendations: ["Upload a document to get recommendations"],
      riskDetails: "Upload a document to see risk details"
    }
  ];

  // Risk color functions
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleClauseClick = (clause: Clause) => {
    setSelectedClause(clause);
    setIsModalOpen(true);
  };

  // Sort clauses by risk level (High -> Medium -> Low)
  const sortClausesByRisk = (clauseList: Clause[]) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return clauseList.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
  };

  // Semantic search function
  const performSemanticSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredClauses(sortClausesByRisk(clauses));
      return;
    }

    const results = clauses.filter(clause => {
      const searchTerms = query.toLowerCase().split(' ');
      const searchableText = `${clause.title} ${clause.summary} ${clause.impact}`.toLowerCase();
      
      return searchTerms.some(term => searchableText.includes(term));
    });

    setFilteredClauses(sortClausesByRisk(results));
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSemanticSearch(query);
  };

  // Initialize filtered clauses and update when analysisData changes
  React.useEffect(() => {
    setFilteredClauses(sortClausesByRisk(clauses));
  }, [analysisData, clauses]);

  // Calculate risk data for pie chart using real data
  const riskData = analysisData?.risk_data || [
    {
      name: 'High',
      value: clauses.filter(c => c.risk === 'high').length,
      color: '#ef4444',
      impacts: clauses.filter(c => c.risk === 'high').map(c => ({
        id: c.title.toLowerCase().replace(/\s+/g, '-'),
        name: c.title,
        description: c.impact,
        risk: c.risk as 'high' | 'medium' | 'low'
      }))
    },
    {
      name: 'Medium',
      value: clauses.filter(c => c.risk === 'medium').length,
      color: '#eab308',
      impacts: clauses.filter(c => c.risk === 'medium').map(c => ({
        id: c.title.toLowerCase().replace(/\s+/g, '-'),
        name: c.title,
        description: c.impact,
        risk: c.risk as 'high' | 'medium' | 'low'
      }))
    },
    {
      name: 'Low',
      value: clauses.filter(c => c.risk === 'low').length,
      color: '#22c55e',
      impacts: clauses.filter(c => c.risk === 'low').map(c => ({
        id: c.title.toLowerCase().replace(/\s+/g, '-'),
        name: c.title,
        description: c.impact,
        risk: c.risk as 'high' | 'medium' | 'low'
      }))
    }
  ];

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        <motion.div
          className="absolute top-40 right-20 w-24 h-24 bg-accent/10 rounded-full blur-lg"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="glass-card sticky top-0 z-50 border-b border-border/20"
        variants={itemVariants}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackNavigation />
              <motion.div 
                className="flex items-center space-x-3 cursor-pointer group"
                onClick={() => navigateWithTransition('/dashboard', 'Loading...')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-white font-bold text-lg">⚖</span>
                </motion.div>
                <div>
                  <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    Legucid
                  </h1>
                  <p className="text-sm text-muted-foreground">Detailed Analysis</p>
                </div>
              </motion.div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Page Header */}
        <motion.div 
          className="mb-8 text-center"
          variants={itemVariants}
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {isLoading ? 'Analyzing Document...' : 'Detailed Document Analysis'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {analysisData?.document_name 
              ? `Analysis of ${analysisData.document_name} - Comprehensive clause-by-clause analysis with interactive risk assessment and actionable insights`
              : 'Comprehensive clause-by-clause analysis with interactive risk assessment and actionable insights'
            }
          </p>
          {isLoading && (
            <div className="flex items-center justify-center mt-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2" />
              <span className="text-muted-foreground">Processing document...</span>
            </div>
          )}
        </motion.div>


        {/* Search and Filter */}
        <motion.div 
          className="mb-8"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Clause Analysis
                {analysisData && (
                  <span className="text-lg font-normal text-muted-foreground ml-2">
                    ({clauses.length} clause{clauses.length !== 1 ? 's' : ''} analyzed)
                  </span>
                )}
              </h2>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-1">
                  Found {filteredClauses.length} clause{filteredClauses.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clauses by keywords (e.g., compensation, termination, liability)..." 
                className="pl-10 glass-card border-0"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilteredClauses(sortClausesByRisk(clauses));
              }}
              disabled={!searchQuery.trim()}
              className="glass-card border-0"
            >
              <Filter className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </motion.div>

        {/* Clause Cards - Vertical Layout */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          variants={containerVariants}
        >
          {filteredClauses.length === 0 ? (
            <motion.div 
              className="text-center py-12"
              variants={itemVariants}
            >
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No clauses found</h3>
              <p className="text-muted-foreground mb-4">
                Try searching with different keywords or check your spelling
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilteredClauses(sortClausesByRisk(clauses));
                }}
                className="glass-card border-0"
              >
                Show All Clauses
              </Button>
            </motion.div>
          ) : (
            filteredClauses.map((clause, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`glass-card p-6 cursor-pointer rounded-3xl border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group perspective-1000 h-full flex flex-col bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 backdrop-blur-sm hover:from-white/90 hover:to-white/70 dark:hover:from-gray-900/90 dark:hover:to-gray-800/70 ${getRiskColor(clause.risk)}`}
                  onClick={() => handleClauseClick(clause)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getRiskIcon(clause.risk)}
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getRiskBadgeColor(clause.risk)} text-white shadow-sm hover:shadow-md transition-all duration-200 group-hover:scale-105`}>
                        {clause.risk.toUpperCase()} RISK
                      </span>
                    </div>
                    <motion.span 
                      className="text-muted-foreground group-hover:text-primary transition-colors text-lg font-bold"
                      whileHover={{ x: 5, scale: 1.1 }}
                    >
                      →
                    </motion.span>
                  </div>
                  
                  <h3 className="font-bold text-foreground mb-3 text-lg group-hover:text-primary transition-colors group-hover:scale-105 transform duration-200">{clause.title}</h3>
                  <p className="text-muted-foreground mb-3 leading-relaxed">{clause.summary}</p>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-l-4 border-red-400 dark:border-red-500 rounded-lg p-4 mt-3 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200"></div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 leading-relaxed">{clause.impact}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Ready for Next Steps */}
        <motion.div
          variants={itemVariants}
          className="mb-12"
        >
          <Card className="glass-card p-8 rounded-3xl border-0 shadow-xl hover:shadow-2xl transition-all duration-500 group perspective-1000 bg-primary/5 border-primary/20">
            <h3 className="text-2xl font-bold text-foreground mb-6 group-hover:text-primary transition-colors">Ready for Next Steps?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 rounded-2xl glass-card border-0 hover:bg-blue-500 hover:text-white transition-all duration-300"
                >
                  Compare to Market Standards
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 rounded-2xl glass-card border-0 hover:bg-blue-500 hover:text-white transition-all duration-300"
                  onClick={() => navigateWithTransition('/counter-proposal', 'Loading...')}
                >
                  Negotiate
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 rounded-2xl glass-card border-0 hover:bg-blue-500 hover:text-white transition-all duration-300"
                  onClick={() => setIsChatbotOpen(true)}
                >
                  Chat with Us
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Blinking Cursor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <Footer className="mt-16" />
        </motion.div>
      </div>

      <ClauseDetailModal
        clause={selectedClause}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClause(null);
        }}
      />

      <ChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />
    </motion.div>
  );
};

export default DetailedDocumentAnalysis;