interface FeedItem {
  title: FeedItemProperty;
  url: FeedItemProperty;
  author: FeedItemProperty;
  description: FeedItemProperty;
  date: FeedItemProperty;
}

interface FeedItemProperty {
  text: string;
  html: string;
}

interface AnalysisResult {
  items: FeedItem[];
  source?: string;
  logs: string[];
  html: string;
}

export type { FeedItem, AnalysisResult, FeedItemProperty };
