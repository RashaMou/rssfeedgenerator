import router from "./router.js";
import { UIManager } from "./UIManager";
import { TemplateManager } from "./TemplateManager";
import { EventManager } from "./EventManager";
import { ViewManager } from "./ViewManager";
import { store } from "./store";
import { APIClient } from "./APIClient.js";
import { APIError } from "./types.js";

export class RSSApp {
  private templateManager: TemplateManager;
  private ui: UIManager;
  private eventManager: EventManager;
  private viewManager: ViewManager;

  constructor() {
    this.templateManager = new TemplateManager();

    this.templateManager.initialize();

    this.ui = new UIManager();

    this.eventManager = new EventManager(
      this.onUrlSubmit.bind(this),
      this.onToggleSelection.bind(this),
      this.onGenerateFeed.bind(this),
      this.onCopyFeedUrl.bind(this),
      this.updateFeedItems.bind(this),
      this.ui,
    );

    this.viewManager = new ViewManager(
      this.eventManager,
      this.ui,
      this.templateManager,
    );

    // Initialize routing
    router.onRouteChange(() => this.onViewChange());

    this.init();
  }

  public updateFeedItems(elementPath: string, mappingFieldName: string): void {
    const { iframeDocument, originalFeedItems } = store.getState();

    if (!iframeDocument) return;

    const similarElements = iframeDocument!.querySelectorAll(elementPath);

    const updatedItems = originalFeedItems.map((item, index) => {
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
    });

    store.updateCurrentFeedItems(updatedItems);
    this.viewManager.renderRssPreview();
  }

  // Called whenever the view changes (e.g., switching to mapping or home)
  private onViewChange(): void {
    const path = window.location.pathname;

    if (path.match(/^\/[^/]+\/mapping$/)) {
      const { html } = store.getState();
      this.viewManager.renderMappingView(html);
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

    store.setCurrentUrl(validatedUrl);
    const { currentUrl } = store.getState();

    try {
      // Step 1: Analyze Website Structure
      await this.ui.showLoading("Analyzing website structure...");

      const analysisResult = await APIClient.analyzeWebsite(currentUrl);

      if (analysisResult.error) {
        this.ui.showError(analysisResult.error.message);
        return;
      }

      // Step 2: Generate Preview
      await this.ui.showLoading("Generating preview...");

      if (analysisResult.success) {
        store.setFeedItems(analysisResult.result.items);
        store.setHtml(analysisResult.result.html);

        // Step 3: Setup Mapping Tools
        await this.ui.showLoading("Setting up mapping tools...");

        const siteName = new URL(currentUrl).hostname;
        router.navigateTo(`/${siteName}/mapping`);
        this.ui.hideError();
        this.ui.hideLoading();
      }
    } catch (err) {
      this.ui.showError("some error");
      console.error("Analysis Failed:", err);
    }
  }

  public async onToggleSelection(buttonId: string): Promise<void> {
    const { activeSelector } = store.getState();

    // if we don't already have an activeSelector
    if (!activeSelector) {
      store.setSelectionMode(true);
      store.setActiveSelector(buttonId);
    }

    // if we do already have an activeSelector
    if (activeSelector && activeSelector !== buttonId) {
      store.setActiveSelector(buttonId);
      this.eventManager.registerIframeEventClear();
    }

    const { selectionMode } = store.getState();
    if (selectionMode) {
      this.eventManager.registerIframeEvents();
    }
  }

  public async onCopyFeedUrl(): Promise<void> {
    console.log("in onCopyFeedUrl");
    const rssUrlElement = document.querySelector(
      "#rssUrl",
    ) as HTMLAnchorElement;

    console.log("rssUrlElement", rssUrlElement);
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
    const { currentFeedItems, currentUrl } = store.getState();

    const feedLink = await APIClient.generateFeed(currentFeedItems, currentUrl);
    store.setFeedLink(feedLink);

    const rssUrlElement = document.getElementById(
      "rssUrl",
    ) as HTMLAnchorElement;

    if (rssUrlElement) {
      rssUrlElement.href = feedLink;
      rssUrlElement.target = "_blank";
      rssUrlElement.rel = "noopener noreferrer";
    }

    this.ui.showDialog();
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
        const validatedUrl = await APIClient.checkUrl(urlToCheck);
        return validatedUrl;
      } catch (error) {
        if ((error as APIError).type === "network") {
          this.ui.showError(
            "Unable to reach this website. Please check the URL and try again.",
          );
        } else {
          this.ui.showError(
            "This website appears to be unavailable. Please check the URL and try again.",
          );
        }
        return "";
      }
    } catch (error) {
      this.ui.showError("Please enter a valid URL");
      return "";
    }
  }
}
