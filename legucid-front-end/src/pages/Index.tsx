import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileCheck, BarChart3, Handshake, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentUpload } from '@/components/ui/document-upload';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Footer } from '@/components/ui/footer';
import { useTheme } from '@/contexts/ThemeContext';

const Index = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();

  const handleDocumentUpload = (file: File) => {
    console.log('Document uploaded:', file.name);
    // Simulate navigation to dashboard after upload
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
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
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const
      }
    },
    hover: {
      scale: 1.05,
      y: -10,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  const steps = [
    {
      icon: FileCheck,
      title: "Upload Document",
      description: "Upload your legal document for instant analysis"
    },
    {
      icon: BarChart3,
      title: "AI Analysis",
      description: "Get complexity scores and clause breakdowns"
    },
    {
      icon: Handshake,
      title: "Negotiate Better",
      description: "Generate counter-proposals and redlined versions"
    },
    {
      icon: Download,
      title: "Download Package",
      description: "Get lawyer-ready summaries and negotiation tools"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
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
            ease: 'easeInOut'
          }}
        />
        <motion.div
          className="absolute bottom-20 left-1/4 w-40 h-40 bg-success/10 rounded-full blur-2xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -80, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="glass-card sticky top-0 z-50 border-b border-border/50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => navigate('/dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <FileCheck className="h-5 w-5 text-primary-foreground" />
              </motion.div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Legucid
              </h1>
            </motion.div>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center space-x-6">
                <motion.a 
                  href="#how-it-works" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  whileHover={{ y: -2 }}
                >
                  How it Works
                </motion.a>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        className="container mx-auto px-4 py-20 text-center relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-5xl mx-auto">
          <motion.h1 
            className="text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight"
            variants={itemVariants}
          >
            Your Personal Guide to
            <motion.span 
              className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent ml-4"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
            >
              Legal Documents
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
            variants={itemVariants}
          >
            Transform anxiety into empowerment. Upload any legal document and get instant 
            AI-powered analysis, plain-English explanations, and negotiation tools.
          </motion.p>
          
          <motion.div variants={itemVariants} className="mb-12">
            <DocumentUpload onUpload={handleDocumentUpload} className="mb-12" />
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
            variants={itemVariants}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-4 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Try Sample Document
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="ml-2 h-5 w-5" />
                </motion.div>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto px-8 py-4 text-lg rounded-2xl glass-card border-0 hover:shadow-xl transition-all duration-300"
              >
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
            variants={itemVariants}
          >
            <motion.span 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span 
                className="w-2 h-2 bg-success rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              Free analysis
            </motion.span>
            <motion.span 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span 
                className="w-2 h-2 bg-success rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              No signup required
            </motion.span>
          </motion.div>
        </div>
      </motion.section>


      {/* How It Works */}
      <motion.section 
        id="how-it-works" 
        className="glass-card py-20 relative z-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              How Legucid Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              From confusion to confidence in four simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div 
                key={index} 
                className="text-center group"
                variants={cardVariants}
                whileHover="hover"
              >
                <div className="relative mb-8">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:shadow-glow transition-all duration-300"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <step.icon className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                  <motion.div 
                    className="absolute -top-2 -right-2 w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center text-lg font-bold text-accent backdrop-blur-sm border border-accent/30"
                    whileHover={{ scale: 1.1 }}
                  >
                    {index + 1}
                  </motion.div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <Footer className="py-8" />
    </div>
  );
};

export default Index;
