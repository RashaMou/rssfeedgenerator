import router from "@/router/router.js";
import { UIManager } from "@/components/UIManager";
import { TemplateManager } from "@/components/TemplateManager";
import { EventManager } from "@/components/EventManager";
import { ViewManager } from "@/components/ViewManager";
import { store } from "@/store/store.js";
import { APIClient } from "@/api/APIClient.js";
import { APIError } from "@/types.js";

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
    );

    this.viewManager = new ViewManager(
      this.eventManager,
      this.ui,
      this.templateManager,
    );

    router.onRouteChange(() => this.onViewChange());

    this.init();
  }

  private updateFeedItems(elementPath: string, mappingFieldName: string): void {
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
      this.ui.showError(
        "Something went wrong, please check the url and try again",
      );
      console.error("Analysis Failed:", err);
    }
  }

  private async onToggleSelection(buttonId: string): Promise<void> {
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

  private async onCopyFeedUrl(): Promise<void> {
    const xmlLink = document.querySelector(".xml-link") as HTMLAnchorElement;

    if (!xmlLink?.href) return;

    const copyButton = document.querySelector(
      ".copy-button",
    ) as HTMLButtonElement;

    await navigator.clipboard.writeText(xmlLink.href);
    copyButton.textContent = "Link copied";

    copyButton.classList.add("success");
    setTimeout(() => copyButton.classList.remove("success"), 1000);
  }

  private async onGenerateFeed(): Promise<void> {
    const { currentFeedItems, currentUrl } = store.getState();

    try {
      const feedLink = await APIClient.generateFeed(
        currentFeedItems,
        currentUrl,
      );

      if (!feedLink) {
        this.ui.showError("Failed to generate feed link");
        return;
      }

      store.setFeedLink(feedLink);

      // Update XML link
      const xmlLink = document.querySelector(".xml-link") as HTMLAnchorElement;
      if (xmlLink) {
        xmlLink.href = feedLink;
        xmlLink.target = "_blank";
        xmlLink.rel = "noopener noreferrer";
      }

      this.ui.showDialog();
    } catch (error) {
      console.error("Error generating feed:", error);
      this.ui.showError("Failed to generate feed");
    }
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
