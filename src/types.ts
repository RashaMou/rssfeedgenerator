interface AnalysisResult {
  items: any[];
  html: string;
}

interface AnalysisResponse {
  success: boolean;
  error?: {
    message: string;
  };
  result: AnalysisResult; // Make result non-optional since we check success
}

interface APIError extends Error {
  status?: number;
  statusText?: string;
  type: "network" | "http" | "unknown";
}

interface Templates {
  websitePreview: HTMLTemplateElement;
  elementMapping: HTMLTemplateElement;
  rssPreview: HTMLTemplateElement;
  feedFields: HTMLTemplateElement;
  inputForm: HTMLTemplateElement;
}

export type { Templates, APIError, AnalysisResult, AnalysisResponse };
