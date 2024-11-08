import { FeedItem } from "server/services/types";

interface State {
  // Loading and error stores
  status: "loading" | "error" | "";

  // Current website info
  currentUrl: string;
  html: string;

  // Feed items
  originalFeedItems: FeedItem[];
  currentFeedItems: FeedItem[];
  feedLink: string;

  // Element selection store
  selectionMode: boolean;
  activeSelector: string;

  // Preview store
  iframeDocument: Document | null;
}

export { State };
