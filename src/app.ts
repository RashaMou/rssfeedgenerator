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
    this.ui = new UIManager(this.state);

    this.eventManager = new EventManager(
      this.onUrlSubmit.bind(this),
      this.onToggleSelection.bind(this),
      this.onGenerateFeed.bind(this),
      this.onCopyFeedUrl.bind(this),
      this.updateFeedItems.bind(this),
      this.state,
      this.ui,
    );

    this.viewManager = new ViewManager(
      this.eventManager,
      this.ui,
      this.templateManager,
      this.state,
    );

    // Initialize routing
    router.onRouteChange(() => this.onViewChange());

    this.init();
  }

  public updateFeedItems(elementPath: string, mappingFieldName: string): void {
    const similarElements =
      this.state.iframeDocument!.querySelectorAll(elementPath);

    this.state.currentFeedItems = this.state.originalFeedItems.map(
      (item, index) => {
        const element = similarElements[index];
        let value = "";

        if (element) {
          if (mappingFieldName === "link") {
            // For links, prefer data-href, fallback to href
            value =
              element.getAttribute("data-href") ||
              element.getAttribute("href") ||
              "";
          } else {
            // For other fields, use text content
            value = element.textContent?.trim() || "";
          }
        }

        return {
          ...item,
          [mappingFieldName]: value,
        };
      },
    );
    this.viewManager.renderRssPreview();
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

  private async onUrlSubmit(urlInput: string): Promise<void> {
    const validatedUrl = await this.validateUrl(urlInput);

    if (!validatedUrl) {
      this.ui.showError("hm?");
      return;
    }

    this.updateState({ currentUrl: validatedUrl });

    try {
      // Step 1: Analyze Website Structure
      await this.ui.showLoading("Analyzing website structure...");

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
      await this.ui.showLoading("Generating preview...");

      if (analysisResult.success) {
        this.updateState({
          originalFeedItems: analysisResult.result.items,
          currentFeedItems: analysisResult.result.items,
          html: analysisResult.result.html,
        });

        // Step 3: Setup Mapping Tools
        await this.ui.showLoading("Setting up mapping tools...");

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

  private async onToggleSelection(buttonId: string): Promise<void> {
    // if we don't already have an activeSelector
    if (!this.state.activeSelector) {
      this.state.selectionMode = true;
      this.state.activeSelector = buttonId;
    }

    // if we do already have an activeSelector
    if (this.state.selectionMode && this.state.activeSelector !== buttonId) {
      this.state.activeSelector = buttonId;
      // this removeEventListener should go in the EventManager
      this.eventManager.registerIframeEventClear();
    }

    if (this.state.selectionMode) {
      this.eventManager.registerIframeEvents();
    }
  }

  public async onCopyFeedUrl(): Promise<void> {
    const rssUrlElement = document.querySelector(
      "#rssUrl",
    ) as HTMLAnchorElement;
    if (!rssUrlElement?.href) return;

    const copyButton = document.querySelector(
      ".copy-button",
    ) as HTMLButtonElement;

    await navigator.clipboard.writeText(rssUrlElement.href);
    copyButton.textContent = "Link copied";

    copyButton.classList.add("success");
    setTimeout(() => copyButton.classList.remove("success"), 1000);
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

  private setState(newState: Partial<RSSState>) {
    this.state = { ...this.state, ...newState };
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
