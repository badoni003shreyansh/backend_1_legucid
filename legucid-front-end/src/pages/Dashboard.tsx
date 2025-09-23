import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Footer } from '@/components/ui/footer';
import { RiskPieChart } from '@/components/ui/risk-pie-chart';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useDocumentAnalysis } from '@/contexts/DocumentAnalysisContext';
import { usePageTransitionNavigation } from '@/hooks/use-page-transition';
import { DocumentAnalysisData } from '@/types/documentAnalysis';
import { ArrowLeft } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const { analysisData, isLoading } = useDocumentAnalysis();
  const { navigateWithTransition } = usePageTransitionNavigation();
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  // Debug logging for dashboard data
  console.log("=== DASHBOARD COMPONENT RENDERED ===");
  console.log("Analysis data:", analysisData);
  console.log("Is loading:", isLoading);

  // Calculate time saved using the provided formula
  const calculateTimeSaved = (pages: number, clauses: number): string => {
    // S = (pages × 2) + (clauses × 1.5)
    const S = (pages * 2) + (clauses * 1.5);
    
    // Time Saved (hours) = 1 + S / (S + 50)
    const timeSavedHours = 1 + (S / (S + 50));
    
    // Convert to hours and minutes
    const hours = Math.floor(timeSavedHours);
    const minutes = Math.round((timeSavedHours - hours) * 60);
    
    return `${hours} hr ${minutes} min`;
  };

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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const
      }
    },
    hover: {
      scale: 1.05,
      rotateY: 5,
      rotateX: 5,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  // Use dynamic data from context or fallback to default data
  const riskData = analysisData?.risk_data || [
    {
      name: 'High',
      value: 0,
      color: '#ef4444',
      impacts: []
    },
    {
      name: 'Medium',
      value: 0,
      color: '#eab308',
      impacts: []
    },
    {
      name: 'Low',
      value: 0,
      color: '#22c55e',
      impacts: []
    }
  ];

  // Calculate totals from dynamic data
  const totalImpacts = riskData.reduce((sum, item) => sum + item.value, 0);
  const totalClauses = analysisData?.total_clauses || totalImpacts;
  const flaggedClauses = analysisData?.flagged_clauses || riskData
    .filter(item => item.name === 'High' || item.name === 'Medium')
    .reduce((sum, item) => sum + item.value, 0);
  const pageCount = analysisData?.page_count || 24;
  
  // Calculate time saved using the formula
  const timeSaved = analysisData ? calculateTimeSaved(pageCount, totalClauses) : '2.5h';
  
  // Debug logging for time saved calculation
  if (analysisData) {
    console.log("=== DASHBOARD TIME SAVED CALCULATION ===");
    console.log(`Page count: ${pageCount}`);
    console.log(`Total clauses: ${totalClauses}`);
    console.log(`Calculated time saved: ${timeSaved}`);
  }
  
  const documentName = analysisData?.document_name || 'Software Development Agreement';
  const uploadTime = analysisData?.upload_time || '5 minutes ago';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.15)_1px,transparent_0)] bg-[length:24px_24px] opacity-30"></div>
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 0.9, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateWithTransition('/', 'Loading...')}
                className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 border border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </Button>
              <motion.div 
                className="flex items-center space-x-4 cursor-pointer group"
                onClick={() => navigateWithTransition('/dashboard', 'Loading...')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                  whileHover={{ rotate: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-white font-bold text-xl">⚖</span>
                </motion.div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  Legucid
                </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Legal Document Analysis Platform
                  </span>
                </div>
              </motion.div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-sm text-slate-500 dark:text-slate-400">Analysis Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {isLoading ? 'Processing...' : 'Complete'}
                  </span>
                </div>
            </div>
            <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div 
        className="container mx-auto px-4 py-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Document Header */}
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <motion.div
              className="flex items-start justify-between mb-6"
              initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex-1">
                <motion.h1 
                  className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  {documentName}
                </motion.h1>
                <motion.div 
                  className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-sm font-medium">
                      {isLoading ? 'Analyzing document...' : 'Analysis complete'}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                  <span className="text-sm font-medium">Uploaded {uploadTime}</span>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600"></div>
                  <span className="text-sm font-medium">{pageCount} pages</span>
                </motion.div>
              </div>
              <motion.div 
                className="hidden md:flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-2xl px-4 py-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Document ID</div>
                  <div className="text-sm font-mono text-slate-700 dark:text-slate-300 max-w-40 truncate" title={documentName}>
                    {(() => {
                      const nameWithoutExt = documentName.replace(/\.[^/.]+$/, '');
                      return nameWithoutExt.length > 20 
                        ? `${nameWithoutExt.substring(0, 20)}...` 
                        : nameWithoutExt;
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Risk Analysis Pie Chart with Stats */}
        <motion.div variants={itemVariants} className="mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Risk Impact Analysis</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Interactive risk assessment with detailed clause analysis</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalImpacts}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Risk Points</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              {/* Pie Chart */}
              <div className="lg:col-span-3">
                <div className="relative h-80 w-full">
                  <RiskPieChart data={riskData} />
                </div>
                
                {/* Legend - Below Pie Chart */}
                <div className="flex justify-center gap-8 mt-8">
                  {riskData.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 cursor-pointer group"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full shadow-sm group-hover:shadow-md transition-all duration-200" 
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                          {item.name} Risk
                        </span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-medium">
                          {item.value} clauses
                      </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Stats - Vertical Stack */}
              <div className="lg:col-span-1 space-y-6">
                <motion.div 
                  className="text-center p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 group hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{totalClauses}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Clauses</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">Analyzed</div>
                </motion.div>
                
                <motion.div 
                  className="text-center p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 group hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">{flaggedClauses}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Flagged Clauses</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">Require Attention</div>
                </motion.div>
                
                <motion.div 
                  className="text-center p-6 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 group hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{timeSaved}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Time Saved</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">Efficiency Gain</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analysis Options */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
          variants={containerVariants}
        >
          {/* Audio Decipher Card */}
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
          >
            <div 
              className="bg-white dark:bg-slate-800 p-8 cursor-pointer rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
              onClick={() => navigateWithTransition('/audio-decipher', 'Loading...')}
            >
              <div className="flex items-center justify-between mb-6">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                  whileHover={{ rotate: 5, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-3xl">🎵</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-2 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <span className="text-sm font-medium">Explore</span>
                  <span className="text-xl">→</span>
                </motion.div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Audio Decipher
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed text-sm">
                Convert audio recordings of legal discussions into structured analysis and actionable insights with AI-powered transcription.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm group-hover:gap-3 transition-all">
                  <span>Start Analysis</span>
                <motion.span
                    animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  AI-Powered
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Document Analysis Card */}
          <motion.div
            variants={cardVariants}
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
          >
            <div 
              className="bg-white dark:bg-slate-800 p-8 cursor-pointer rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
              onClick={() => navigateWithTransition('/detailed-analysis', 'Loading...')}
            >
              <div className="flex items-center justify-between mb-6">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                  whileHover={{ rotate: 5, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-3xl">📋</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-2 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <span className="text-sm font-medium">View</span>
                  <span className="text-xl">→</span>
                </motion.div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Detailed Document Analysis
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed text-sm">
                Comprehensive clause-by-clause analysis with risk assessment, market comparisons, and negotiation recommendations.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm group-hover:gap-3 transition-all">
                  <span>View Analysis</span>
                <motion.span
                    animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  {flaggedClauses} Issues
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <Footer className="mt-20" />

      </motion.div>

    </div>
  );
};

export default Dashboard;