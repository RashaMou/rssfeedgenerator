import { RSSState } from "./types";
import router from "./router.js";
import { UIManager } from "./UIManager";
import { TemplateManager } from "./TemplateManager";
import { EventManager } from "./EventManager";
import { ViewManager } from "./ViewManager";

type StateUpdater = (newState: Partial<RSSState>) => void;

export class RSSApp {
  private templateManager: TemplateManager;
  private ui: UIManager;
  private state: RSSState;
  private updateState: StateUpdater;
  private eventManager: EventManager;
  private viewManager: ViewManager;

  constructor() {
    this.templateManager = new TemplateManager();

    this.eventManager = new EventManager(
      this.onUrlSubmit.bind(this),
      this.onGenerateFeed.bind(this),
      this.onCopyFeedUrl.bind(this),
    );

    this.templateManager.initialize();

    this.state = {
      status: "",
      currentUrl: "",
      preview: null,
      iframeDocument: null,
      originalFeedItems: [],
      currentFeedItems: [],
      selectionMode: false,
      activeSelector: "",
      html: "",
      feedLink: "",
    };

    this.updateState = (newState) => this.setState(newState);
    this.ui = new UIManager(this.updateState, this.state);
    this.viewManager = new ViewManager(
      this.eventManager,
      this.ui,
      this.templateManager,
    );

    // Initialize routing
    router.onRouteChange(() => this.onViewChange());

    this.init();
  }

  private async onUrlSubmit(urlInput: string): Promise<void> {
    const validatedUrl = await this.validateUrl(urlInput);

    if (!validatedUrl) {
      this.ui.showError("hm?");
      return;
    }

    this.updateState({ currentUrl: validatedUrl });

    this.ui.showLoading("");

    try {
      // Step 1: Analyze Website Structure
      this.ui.showLoading("Analyzing website structure...");

      const response = await fetch(
        `/api/analyze/${encodeURIComponent(this.state.currentUrl)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const analysisResult = await response.json();

      if (analysisResult.error) {
        this.ui.showError(analysisResult.error.message);
        return;
      }

      // Step 2: Generate Preview
      this.ui.showLoading("Generating preview...");

      if (analysisResult.success) {
        this.updateState({
          originalFeedItems: analysisResult.result.items,
          currentFeedItems: analysisResult.result.items,
          html: analysisResult.result.html,
        });

        // Step 3: Setup Mapping Tools
        this.ui.showLoading("Setting up mapping tools...");

        const siteName = new URL(this.state.currentUrl).hostname;
        router.navigateTo(`/${siteName}/mapping`);
        this.ui.hideError();
        this.ui.hideLoading();
      }
    } catch (err) {
      this.ui.showError("some error");
      console.error("Analysis Failed:", err);
    }
  }

  private async onGenerateFeed(): Promise<void> {
    const response = await fetch("/api/generate-feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feedItems: this.state.currentFeedItems,
        siteUrl: this.state.currentUrl,
      }),
    });

    const feedLink = await response.text();
    this.state.feedLink = feedLink;
    const rssUrlElement = document.getElementById(
      "rssUrl",
    ) as HTMLAnchorElement;

    if (rssUrlElement) {
      rssUrlElement.href = this.state.feedLink;
      rssUrlElement.target = "_blank";
      rssUrlElement.rel = "noopener noreferrer";
    }

    this.ui.showDialog();
  }

  private async onCopyFeedUrl() {
    const copyButton = document.querySelector(
      ".copy-button",
    ) as HTMLButtonElement;

    copyButton.textContent = "Copy link";

    const rssUrlElement = document.querySelector(
      "#rssUrl",
    ) as HTMLAnchorElement;
    if (!rssUrlElement?.href) return;

    try {
      await navigator.clipboard.writeText(rssUrlElement.href);
      copyButton.textContent = "Link copied";
      copyButton.classList.add("success");
      setTimeout(() => copyButton.classList.remove("success"), 1000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }

  private setState(newState: Partial<RSSState>) {
    this.state = { ...this.state, ...newState };
    // this.uiManager.render(this.state); // Rerender UI with updated state
  }

  private init(): void {
    // Handle page reloads more gracefully
    if (window.performance) {
      const navigationEntry = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      if (navigationEntry && navigationEntry.type === "reload") {
        const path = window.location.pathname;
        // Only redirect to home if we're in the mapping view
        if (path.match(/^\/[^/]+\/mapping$/)) {
          window.location.href = "/";
          return;
        }
      }
    }

    this.viewManager.renderHomeView();
  }

  // Called whenever the view changes (e.g., switching to mapping or home)
  private onViewChange(): void {
    const path = window.location.pathname;

    if (path.match(/^\/[^/]+\/mapping$/)) {
      this.viewManager.renderMappingView(this.state.html);
    } else {
      this.viewManager.renderHomeView();
    }
  }

  private async validateUrl(url: string): Promise<string> {
    try {
      // Check if URL is empty or just whitespace
      if (!url.trim()) {
        this.ui.showError("URL cannot be empty");
        return "";
      }

      // Add https:// if no protocol is specified
      let urlToCheck = url;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        urlToCheck = `https://${url}`;
      }

      // Check if website exists by making a HEAD request
      try {
        const response = await fetch(
          `/api/check-url/${encodeURIComponent(urlToCheck)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          this.ui.showError(
            "This website appears to be unavailable. Please check the URL and try again.",
          );
          return "";
        }
      } catch (networkError) {
        this.ui.showError(
          "Unable to reach this website. Please check the URL and try again.",
        );
        return "";
      }

      return urlToCheck;
    } catch (error) {
      this.ui.showError("Please enter a valid URL");
      return "";
    }
  }
}
