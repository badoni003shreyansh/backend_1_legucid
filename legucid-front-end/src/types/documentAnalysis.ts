export interface RiskImpact {
  id: string;
  name: string;
  description: string;
  risk: 'high' | 'medium' | 'low';
}

export interface RiskData {
  name: string;
  value: number;
  color: string;
  impacts: RiskImpact[];
}

export interface DocumentAnalysisData {
  document_name?: string;
  total_clauses?: number;
  flagged_clauses?: number;
  time_saved?: string;
  risk_assessment?: {
    high: RiskImpact[];
    medium: RiskImpact[];
    low: RiskImpact[];
    gcs_uri?: string;
    [key: string]: any; // Allow additional properties from backend
  };
  risk_data?: RiskData[];
  upload_time?: string;
  page_count?: number;
}