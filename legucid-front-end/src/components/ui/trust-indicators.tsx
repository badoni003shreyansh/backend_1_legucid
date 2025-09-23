import React from 'react';
import { Shield, Lock, Award, Users } from 'lucide-react';

export const TrustIndicators: React.FC = () => {
  const indicators = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Your documents are encrypted and secure"
    },
    {
      icon: Lock,
      title: "Private & Confidential",
      description: "We never store or share your legal documents"
    },
    {
      icon: Award,
      title: "Expert Analysis",
      description: "AI trained on thousands of legal documents"
    },
    {
      icon: Users,
      title: "Trusted by 10,000+",
      description: "Professionals and individuals nationwide"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
      {indicators.map((indicator, index) => (
        <div 
          key={index}
          className="flex flex-col items-center text-center p-4 rounded-lg bg-card shadow-card hover:shadow-hover transition-all duration-300"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
            <indicator.icon className="h-6 w-6 text-primary" />
          </div>
          <h4 className="font-semibold text-foreground mb-1">
            {indicator.title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {indicator.description}
          </p>
        </div>
      ))}
    </div>
  );
};