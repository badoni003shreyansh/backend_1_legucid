import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, CheckCircle, FileText } from 'lucide-react';

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

interface ClauseDetailModalProps {
  clause: Clause | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClauseDetailModal: React.FC<ClauseDetailModalProps> = ({
  clause,
  isOpen,
  onClose,
}) => {
  if (!clause) return null;

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium': return <Info className="h-5 w-5 text-yellow-600" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getRiskIcon(clause.risk)}
            <span>{clause.title}</span>
            <Badge className={`${getRiskColor(clause.risk)} text-white`}>
              {clause.risk.toUpperCase()} RISK
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="h-[500px] overflow-y-auto">
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Original Clause Text
              </h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                {clause.fullText}
              </p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Plain English Explanation</h3>
              <p className="text-sm text-gray-700">{clause.summary}</p>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Risk Assessment</h3>
              <p className="text-sm text-gray-700 mb-3">{clause.riskDetails}</p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm font-medium text-red-800">{clause.impact}</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <ul className="space-y-2">
                {clause.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};