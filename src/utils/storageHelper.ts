import { FeedItem } from "server/services/types";

interface StoredMappingState {
  version: 1;
  url: string;
  currentFeedItems: FeedItem[];
  html: string;
  timestamp: number;
}

const STORAGE_KEY = "rss-mapping-state";

export const storageHelper = {
  saveState(url: string, currentFeedItems: FeedItem[], html: string): void {
    try {
      const state: StoredMappingState = {
        version: 1,
        url,
        currentFeedItems,
        timestamp: Date.now(),
        html,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save mapping state:", error);
    }
  },

  loadState(): StoredMappingState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const state = JSON.parse(saved) as StoredMappingState;

      if (state.version !== 1) {
        console.warn("Incompatible state version, clearing storage");
        this.clearState();
        return null;
      }

      return state;
    } catch (error) {
      console.error("Failed to load mapping state:", error);
      return null;
    }
  },

  clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear mapping state:", error);
    }
  },

  hasValidState(): boolean {
    const state = this.loadState();
    if (!state) return false;

    const MAX_AGE = 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - state.timestamp > MAX_AGE;

    if (isExpired) {
      this.clearState();
      return false;
    }

    return true;
  },
};
