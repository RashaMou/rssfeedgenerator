import { FeedItem } from "../server/services/types";

interface RSSState {
  status: "loading" | "error" | "";
  feedLink: string;
  currentUrl: string;
  preview: string | null;
  iframeDocument: Document | null;
  html: string;
  originalFeedItems: FeedItem[];
  currentFeedItems: FeedItem[];
  selectionMode: boolean;
  activeSelector: string;
}

interface Templates {
  websitePreview: HTMLTemplateElement;
  elementMapping: HTMLTemplateElement;
  rssPreview: HTMLTemplateElement;
  feedFields: HTMLTemplateElement;
  inputForm: HTMLTemplateElement;
}

interface RSSMappings {
  title: string;
  date: string;
  content: string;
  author: string;
}

export type { RSSState, Templates, RSSMappings };
