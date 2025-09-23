import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Mail, FileDown, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Clause {
  title: string;
  risk: 'high' | 'medium' | 'low';
  summary: string;
  impact: string;
}

interface NegotiationReplyGeneratorProps {
  clause: Clause;
  onClose: () => void;
}

export const NegotiationReplyGenerator: React.FC<NegotiationReplyGeneratorProps> = ({
  clause,
  onClose,
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [redlinedText, setRedlinedText] = useState<string>('');

  const strategies = [
    {
      id: 'collaborative',
      title: 'Collaborative Approach',
      description: 'Focus on mutual benefits and win-win solutions',
      tone: 'Professional and cooperative'
    },
    {
      id: 'assertive',
      title: 'Assertive Negotiation',
      description: 'Clear about your requirements while remaining professional',
      tone: 'Direct and confident'
    },
    {
      id: 'alternative',
      title: 'Alternative Proposals',
      description: 'Offer multiple options for the other party to consider',
      tone: 'Flexible and solution-oriented'
    }
  ];

  const generateNegotiationContent = async (strategy: string) => {
    setIsGenerating(true);
    
    // Simulate AI generation - in real app, this would call an API
    setTimeout(() => {
      const emailTemplate = `Subject: Proposed Amendments to ${clause.title}

Dear [Counterparty Name],

Thank you for sharing the ${clause.title.toLowerCase()} section of our agreement. After careful review, I'd like to propose some modifications that would better balance the interests of both parties.

Current Concern:
${clause.summary}

Proposed Amendment:
Based on industry standards and to ensure fair treatment for both parties, I suggest modifying this clause to include a 90-day notice period with partial compensation for work completed.

This adjustment would:
• Provide adequate time for project transition
• Ensure fair compensation for delivered work
• Align with industry best practices
• Protect both parties' interests

I believe this modification creates a more balanced agreement that supports our mutual success. I'm happy to discuss this further and explore any concerns you might have.

Best regards,
[Your Name]`;

      const redlined = `TERMINATION FOR CONVENIENCE

[DELETED: Client can terminate without cause with only 30 days notice, no compensation required]

[ADDED: Either party may terminate this agreement for convenience by providing ninety (90) days written notice to the other party. In the event of termination for convenience, the terminating party shall compensate the other party for all work completed and accepted through the date of termination, plus reasonable costs for work in progress that cannot be avoided.]`;

      setGeneratedEmail(emailTemplate);
      setRedlinedText(redlined);
      setIsGenerating(false);
    }, 2000);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose Your Negotiation Strategy</h3>
        <div className="grid grid-cols-1 gap-3">
          {strategies.map((strategy) => (
            <Card
              key={strategy.id}
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedStrategy === strategy.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedStrategy(strategy.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium mb-1">{strategy.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{strategy.description}</p>
                  <Badge variant="outline" className="text-xs">{strategy.tone}</Badge>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedStrategy === strategy.id
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedStrategy && (
        <div className="space-y-4">
          <Button
            onClick={() => generateNegotiationContent(selectedStrategy)}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Negotiation Package...
              </>
            ) : (
              'Generate Negotiation Package'
            )}
          </Button>

          {generatedEmail && (
            <>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Professional Email Draft
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedEmail, 'Email')}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={generatedEmail}
                  onChange={(e) => setGeneratedEmail(e.target.value)}
                  rows={12}
                  className="text-sm"
                />
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Redlined Clause Text
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(redlinedText, 'Redlined text')}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={redlinedText}
                  onChange={(e) => setRedlinedText(e.target.value)}
                  rows={8}
                  className="text-sm font-mono"
                />
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    toast({
                      title: 'Package Downloaded',
                      description: 'Negotiation package saved to your downloads',
                    });
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Download Package
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};