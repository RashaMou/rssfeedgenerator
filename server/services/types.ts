interface FeedItem {
  title: string;
  link: string;
  author: string;
  description: string;
  date: string;
}

interface AnalysisResult {
  items: FeedItem[];
  source?: string;
  logs: string[];
  html: string;
}

export type { FeedItem, AnalysisResult };
