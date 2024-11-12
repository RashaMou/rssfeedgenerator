import { FeedItem } from "../server/services/types";

interface RSSState {
  currentUrl: string;
  preview: string | null;
  iframeDocument: Document | null;
  html: string;
  originalFeedItems: FeedItem[];
  currentFeedItems: FeedItem[];
  selectionMode: boolean;
  activeSelector: string;
  feedLink: string;
}

class RSSStore {
  private state: RSSState;

  constructor() {
    this.state = {
      currentUrl: "",
      preview: null,
      iframeDocument: null,
      html: "",
      originalFeedItems: [],
      currentFeedItems: [],
      selectionMode: false,
      activeSelector: "",
      feedLink: "",
    };
  }

  getState(): RSSState {
    return this.state;
  }

  setState(partial: Partial<RSSState>): void {
    this.state = { ...this.state, ...partial };
  }

  // Specific state updates
  setCurrentUrl(url: string): void {
    this.setState({ currentUrl: url });
  }

  setIframeDocument(doc: Document | null): void {
    this.state.iframeDocument = doc;
  }

  setHtml(html: string): void {
    this.setState({ html });
  }

  setFeedItems(items: FeedItem[]): void {
    this.setState({
      originalFeedItems: items,
      currentFeedItems: items,
    });
  }

  updateCurrentFeedItems(items: FeedItem[]): void {
    this.setState({ currentFeedItems: items });
  }

  setSelectionMode(mode: boolean): void {
    this.setState({ selectionMode: mode });
  }

  setActiveSelector(selector: string): void {
    this.setState({ activeSelector: selector });
  }

  setFeedLink(link: string): void {
    this.setState({ feedLink: link });
  }

  reset(): void {
    this.setState({
      currentUrl: "",
      preview: null,
      html: "",
      originalFeedItems: [],
      currentFeedItems: [],
      selectionMode: false,
      activeSelector: "",
      feedLink: "",
    });
  }
}

export const store = new RSSStore();
