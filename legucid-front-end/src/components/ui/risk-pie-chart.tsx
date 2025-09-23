import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { Card } from './card';
import { Badge } from './badge';
import { AlertTriangle, Info, CheckCircle, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface RiskData {
  name: string;
  value: number;
  color: string;
  impacts: Impact[];
}

interface Impact {
  id: string;
  name: string;
  description: string;
  risk: 'high' | 'medium' | 'low';
}

interface RiskPieChartProps {
  data: RiskData[];
  className?: string;
}

export const RiskPieChart: React.FC<RiskPieChartProps> = ({ data, className }) => {
  console.log('RiskPieChart component rendered with data:', data);
  
  const navigate = useNavigate();
  const [selectedSegment, setSelectedSegment] = useState<RiskData | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const totalImpacts = data.reduce((sum, item) => sum + item.value, 0);

  // Enhanced data with gradients and 3D effects
  const enhancedData = data.map((item, index) => ({
    ...item,
    fill: item.color,
    stroke: item.color,
    strokeWidth: 2,
    gradientId: `gradient-${item.name.toLowerCase()}`,
    shadowColor: `${item.color}40`,
    hoverColor: `${item.color}CC`,
    index
  }));

  // Debug logging
  console.log('RiskPieChart data:', data);
  console.log('RiskPieChart totalImpacts:', totalImpacts);
  console.log('RiskPieChart enhancedData:', enhancedData);

  const getRiskIcon = (risk: 'high' | 'medium' | 'low') => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getRiskColor = (risk: 'high' | 'medium' | 'low') => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const handleSegmentClick = useCallback((data: any) => {
    if (data && data.payload) {
      setIsAnimating(true);
      setTimeout(() => {
        setSelectedSegment(data.payload);
        setIsAnimating(false);
      }, 300);
    }
  }, []);

  const handleSegmentHover = useCallback((data: any) => {
    if (data && data.payload) {
      setHoveredSegment(data.payload.name);
    } else {
      setHoveredSegment(null);
    }
  }, []);

  const handleImpactClick = useCallback((impact: Impact) => {
    // Navigate to detailed document analysis page
    navigate('/detailed-analysis');
  }, [navigate]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, coordinate }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const { x, y } = coordinate;
      
      // Position tooltip based on segment type
      const isMedium = data.name === 'Medium';
      const tooltipStyle = {
        position: 'absolute' as const,
        left: isMedium ? x - 150 : x + 20, // Medium on left, others on right
        top: y - 50, // Position above the hover point
        zIndex: 1000,
        pointerEvents: 'none' as const,
      };
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="glass-card p-4 rounded-2xl shadow-2xl border border-border/30 backdrop-blur-xl"
          style={tooltipStyle}
        >
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-4 h-4 rounded-full shadow-sm" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-lg text-foreground">{data.name}</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {data.name} Risk Impact: <span className="text-foreground font-bold">{data.value}</span>
          </p>
          <div className="mt-2 text-xs text-muted-foreground">
            {((data.value / totalImpacts) * 100).toFixed(1)}% of total
          </div>
        </motion.div>
      );
    }
    return null;
  };

  // Custom active shape for 3D lift effect
  const renderActiveShape = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 20) * cos;
    const sy = cy + (outerRadius + 20) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-2xl font-bold">
          {payload.value}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
          opacity={0.3}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-sm font-medium">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      </g>
    );
  };

  // Early return if no data or all values are 0
  if (!data || data.length === 0 || totalImpacts === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center h-80 w-full">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">No risk data available</div>
            <div className="text-sm text-muted-foreground">Upload a document to see risk analysis</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Professional Pie Chart Container */}
      <motion.div 
        className="relative w-full h-80 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="w-72 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={enhancedData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                onClick={handleSegmentClick}
                onMouseEnter={handleSegmentHover}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {enhancedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke={entry.stroke}
                    strokeWidth={2}
                    style={{ 
                      cursor: 'pointer',
                      filter: hoveredSegment === entry.name ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={(props) => <CustomTooltip {...props} />}
                position={{ x: 'auto', y: 'auto' }}
                allowEscapeViewBox={{ x: false, y: false }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

      {/* Center Total Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <motion.div 
          className="bg-white dark:bg-gray-900 rounded-full shadow-lg border border-border/20 flex items-center justify-center"
          style={{ width: '120px', height: '120px' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="text-center">
            <motion.div 
              className="text-2xl font-bold text-gray-900 dark:text-white leading-none"
              animate={{ scale: isAnimating ? 1.1 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {totalImpacts}
            </motion.div>
            <div className="text-xs text-gray-600 dark:text-gray-300 leading-none mt-1">Total</div>
          </div>
        </motion.div>
      </div>
      </motion.div>

      {/* Impact Details Side Panel */}
      <AnimatePresence>
        {selectedSegment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedSegment(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="glass-card w-[500px] h-[500px] max-w-[85vw] max-h-[85vh] overflow-hidden rounded-2xl border border-border/30 shadow-2xl backdrop-blur-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-3 border-b border-border/30 bg-gradient-to-r from-background/50 to-muted/20 h-[70px] flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: selectedSegment.color }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getRiskIcon(selectedSegment.impacts[0]?.risk || 'low')}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {selectedSegment.name} Risk
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {selectedSegment.impacts.length} clause{selectedSegment.impacts.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setSelectedSegment(null)}
                    className="w-10 h-10 rounded-full bg-red-500/15 hover:bg-red-500/25 border-2 border-red-300/60 hover:border-red-400 flex items-center justify-center transition-all duration-200 group shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="h-5 w-5 text-red-600 group-hover:text-red-700 transition-colors font-bold" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 overflow-y-auto min-h-0 h-[320px]">
                <div className="space-y-3">
                  {selectedSegment.impacts.map((impact, index) => (
                    <motion.div
                      key={impact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className="glass-card p-4 rounded-xl border border-border/20 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
                      whileHover={{ y: -1, scale: 1.01 }}
                      onClick={() => handleImpactClick(impact)}
                    >
                      <div className="flex items-start gap-3">
                        <motion.div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${selectedSegment.color}20` }}
                          whileHover={{ rotate: 5 }}
                        >
                          {getRiskIcon(impact.risk)}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {impact.name}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs font-medium px-2 py-0.5", getRiskColor(impact.risk))}
                            >
                              {impact.risk.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-xs overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {impact.description}
                          </p>
                        </div>
                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          whileHover={{ x: 3 }}
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border/30 bg-gradient-to-r from-muted/20 to-background/50 flex-shrink-0 h-[70px]">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Click outside to close
                  </div>
                  <motion.button
                    onClick={() => setSelectedSegment(null)}
                    className="px-6 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-lg hover:shadow-xl border border-red-400/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
