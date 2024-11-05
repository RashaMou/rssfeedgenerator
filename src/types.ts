import { FeedItem } from "../server/services/types";

interface RSSState {
  status: "input" | "loading" | "error" | "mapping";
  currentUrl: string;
  feedItems: FeedItem[];
  preview: string | null;
  iframeDocument: Document | null;
}

interface Templates {
  websitePreview: HTMLTemplateElement;
  elementMapping: HTMLTemplateElement;
  rssPreview: HTMLTemplateElement;
  feedFields: HTMLTemplateElement;
}

interface RSSMappings {
  title: string;
  date: string;
  content: string;
  author: string;
}

export type { RSSState, Templates, RSSMappings };
