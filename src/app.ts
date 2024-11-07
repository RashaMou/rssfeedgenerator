import { RSSState, Templates } from "./types";
import { onRouteChange, navigateTo } from "./router";
import getElementPath from "./utils/getElementPath";

export class RSSApp {
  private state: RSSState;
  private loadingElement!: HTMLElement;
  private loadingMessageElement!: HTMLElement;
  private errorElement!: HTMLElement;
  private dialog!: HTMLDialogElement;
  private templates!: Templates;
  private currentElementClickHandler: EventListener = (event) =>
    this.handleElementClick(event, this.state.activeSelector);
  private loadingSteps: string[] = [
    "Analyzing website structure...",
    "Generating preview...",
    "Setting up mapping tools...",
  ];

  constructor() {
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

    this.init();
    onRouteChange(() => this.onViewChange());
  }

  private init(): void {
    // Go back to "/" on reload
    if (window.location.pathname !== "/") {
      window.location.href = "/";
      return;
    }

    // Initialize DOM elements
    const errorElement = document.getElementById("error") as HTMLElement;
    const loadingElement = document.getElementById("loading") as HTMLElement;
    const dialog = document.getElementById("feedDialog") as HTMLDialogElement;

    // Assign fetched elements to class properties
    this.loadingElement = loadingElement;
    this.errorElement = errorElement;
    this.dialog = dialog;

    // Initialize loading message element
    this.loadingMessageElement = document.createElement("div");
    this.loadingMessageElement.className = "loading-message";
    this.loadingElement.appendChild(this.loadingMessageElement);

    // Type guard DOM elements
    if (
      !this.loadingElement ||
      !this.errorElement ||
      !this.loadingMessageElement ||
      !this.dialog
    ) {
      throw new Error("Required DOM elements not found");
    }

    // Initialize templates
    this.templates = {
      inputForm: document.getElementById(
        "input-template",
      ) as HTMLTemplateElement,
      websitePreview: document.getElementById(
        "website-preview-template",
      ) as HTMLTemplateElement,
      elementMapping: document.getElementById(
        "element-mapping-template",
      ) as HTMLTemplateElement,
      feedFields: document.getElementById(
        "feed-field-template",
      ) as HTMLTemplateElement,
      rssPreview: document.getElementById(
        "rss-preview-template",
      ) as HTMLTemplateElement,
    };

    // Type guard templates
    if (
      !this.templates.inputForm ||
      !this.templates.websitePreview ||
      !this.templates.elementMapping ||
      !this.templates.feedFields ||
      !this.templates.rssPreview
    ) {
      throw new Error("Required template elements not found");
    }

    this.initializeHomeView();
  }

  // Called whenever the view changes (e.g., switching to mapping or home)
  private onViewChange(): void {
    const path = window.location.pathname;

    if (path.match(/^\/[^/]+\/mapping$/)) {
      this.initializeMappingView(this.state.html);
    } else {
      this.initializeHomeView();
    }
  }

  private initializeHomeView(): void {
    const inputClone = this.createFromTemplate("inputForm");
    const inputContainer = document.createElement("div");
    const contentContainer = document.getElementById("content");

    inputContainer.appendChild(inputClone);

    if (contentContainer) {
      contentContainer.innerHTML = "";
      contentContainer.appendChild(inputContainer);
    } else {
      console.error("Content container not found");
    }

    const urlForm = document.getElementById("urlForm") as HTMLFormElement;

    urlForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleUrlSubmit(e);
    });

    // Setup dialog event listeners
    this.dialog.addEventListener("click", (e) => {
      const dialogDimensions = this.dialog.getBoundingClientRect();
      if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
      ) {
        this.dialog.close();
      }
    });

    const closeButton = document.getElementById("closeBtn");
    closeButton?.addEventListener("click", this.closeDialog);

    const copyButton = document.querySelector(
      ".copy-button",
    ) as HTMLButtonElement;
    copyButton.textContent = "Copy link";
    copyButton?.addEventListener("click", () => {
      this.copyRssUrl(copyButton);
    });
  }

  private async copyRssUrl(button: HTMLButtonElement) {
    const url = this.state.feedLink;
    await navigator.clipboard.writeText(url);
    button.textContent = "Link copied";

    button.classList.add("success");
    setTimeout(() => button.classList.remove("success"), 1000);
  }

  private initializeMappingView(html: string): void {
    const contentContainer = document.getElementById("content");

    if (contentContainer) {
      contentContainer.innerHTML = "";

      const mappingContainer = document.querySelector(
        ".rss-mapping-container",
      ) as HTMLElement;

      // Element mapping
      const elementMappingClone = this.createFromTemplate("elementMapping");
      mappingContainer.appendChild(elementMappingClone);

      // setup element selection buttons
      const targetButtons = document.querySelectorAll(".target");
      targetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.toggleSelectionMode(button.id);
        });
      });

      // website preview
      const websitePreviewClone = this.createFromTemplate("websitePreview");

      const iframe = websitePreviewClone.querySelector(
        "#website-preview-iframe",
      ) as HTMLIFrameElement;

      if (iframe) {
        // Inject <base> tag at the start of the <head> section
        const baseTag = `<base href="${this.state.currentUrl}">`;
        const modifiedHtml = html.replace(
          /<head>/i, // Find the <head> tag to insert the <base> tag after it
          `<head>${baseTag}`,
        );
        iframe.srcdoc = modifiedHtml;
        iframe.onload = () => {
          const iframeDocument: Document =
            iframe.contentDocument! || iframe.contentWindow?.document;

          this.state.iframeDocument = iframeDocument;

          this.addIframeEventListeners(iframeDocument);
        };
      } else {
        console.error("iframe element not found in the cloned template.");
      }

      mappingContainer.appendChild(websitePreviewClone);

      // rss preview
      const rssPreviewClone = this.createFromTemplate("rssPreview");
      mappingContainer.appendChild(rssPreviewClone);

      const feedItemsDiv = document.querySelector("#feedItems");

      if (!feedItemsDiv) {
        console.error("Feed items container not found in template");
        return;
      }

      this.renderRssPreview();

      // add event listener to generate feed button
      const generateButton = document.getElementById("generate-feed");

      generateButton?.addEventListener("click", async (e) => {
        e.preventDefault();

        const copyButton = document.querySelector(
          ".copy-button",
        ) as HTMLButtonElement;
        copyButton.textContent = "Copy link";

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

        this.showDialog();
      });

      contentContainer.appendChild(mappingContainer);
    } else {
      console.error("Content container not found");
    }
  }

  private showDialog = () => {
    this.dialog.showModal();
  };

  private closeDialog = () => {
    this.dialog.close();
  };

  private validateUrl(url: string): boolean {
    let isValid = false;

    const validationMessageElement = document.getElementById(
      "validationMessage",
    ) as HTMLElement;

    try {
      // check basic format
      new URL(url);

      // check domain existence

      // check length

      // check content-type or response
      isValid = true;
      validationMessageElement.textContent = "";
    } catch {
      validationMessageElement.textContent =
        "Please enter a valid URL, including https://";
    }

    return isValid;
  }

  private toggleSelectionMode(buttonId: string): void {
    // if we don't already have an activeSelector
    if (!this.state.activeSelector) {
      this.state.selectionMode = true;
      this.state.activeSelector = buttonId;
    }

    // if we do already have an activeSelector
    if (this.state.selectionMode && this.state.activeSelector !== buttonId) {
      this.state.activeSelector = buttonId;
      this.state.iframeDocument!.removeEventListener(
        "click",
        this.currentElementClickHandler,
      );
    }

    if (this.state.selectionMode) {
      this.state.iframeDocument!.addEventListener(
        "click",
        this.currentElementClickHandler,
      );
    }
  }

  private handleElementClick(event: Event, buttonId: string): void {
    event.preventDefault();

    let selectedElement = event.target as HTMLElement;

    // If we're looking for a link, make sure we get the <a> element
    if (buttonId === "Link") {
      // Find closest anchor tag if we clicked inside one
      const anchorElement = selectedElement.closest("a");
      if (anchorElement) {
        selectedElement = anchorElement;
      }
    }

    const elementPath = getElementPath(selectedElement);

    const pathTextContainer = document.getElementById(`${buttonId}-path`);

    pathTextContainer!.textContent = elementPath;

    this.updateFeedItems(elementPath, buttonId);
  }

  private updateFeedItems(elementPath: string, mappingFieldName: string) {
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
    this.renderRssPreview();
  }

  private renderRssPreview() {
    const feedItemsDiv = document.querySelector("#feedItems");
    if (!feedItemsDiv) {
      console.error("No feed items div found");
      return;
    }

    feedItemsDiv.innerHTML = "";

    this.state.currentFeedItems.forEach((feedItem) => {
      const itemDiv = document.createElement("div");

      const fields = {
        title: feedItem.title,
        author: feedItem.author,
        date: feedItem.date,
        link: feedItem.link,
        description: feedItem.description,
      };

      for (const [fieldName, content] of Object.entries(fields)) {
        const fieldElement = this.createFromTemplate("feedFields");
        const nameElement = fieldElement.querySelector(".field-name");
        const contentElement = fieldElement.querySelector(".field-content");

        if (nameElement && contentElement) {
          nameElement.textContent = fieldName;
          contentElement.textContent = content;
          itemDiv.appendChild(fieldElement);
        }
      }

      feedItemsDiv.appendChild(itemDiv);
    });
  }

  private async handleUrlSubmit(e: SubmitEvent): Promise<void> {
    const form = e.target as HTMLFormElement;
    const input = form.querySelector("input")?.value as string;
    const isValid = this.validateUrl(input);

    if (!isValid) return;

    this.state.currentUrl = input;
    this.updateStatus("loading");

    try {
      // Step 1: Analyze Website Structure
      await this.updateLoadingMessage(this.loadingSteps[0]);

      const response = await fetch(
        `/api/analyze/${encodeURIComponent(input)}`,
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

      // Step 2: Generate Preview
      await this.updateLoadingMessage(this.loadingSteps[1]);
      if (analysisResult.success) {
        this.state.originalFeedItems = this.state.currentFeedItems =
          analysisResult.result.items;

        this.state.html = analysisResult.result.html;

        // Step 3: Setup Mapping Tools
        await this.updateLoadingMessage(this.loadingSteps[2]);

        const siteName = new URL(this.state.currentUrl).hostname;
        navigateTo(`/${siteName}/mapping`);
        this.updateStatus("");
      }
    } catch (err) {
      this.updateStatus("error");
      console.error("Analysis Failed:", err);
    }
  }

  // Update loading message dynamically based on actual task completion
  private async updateLoadingMessage(message: string): Promise<void> {
    this.loadingMessageElement.textContent = message;
    this.loadingMessageElement.classList.add("active");
    await this.fadeInOutEffect();
  }

  // Fade in/out effect between loading messages
  private async fadeInOutEffect(): Promise<void> {
    this.loadingMessageElement.classList.add("active");
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Wait before fading out
    this.loadingMessageElement.classList.remove("active");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  private hasDirectText(element: Element): boolean {
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
  }

  private addIframeEventListeners(iframeDocument: Document): void {
    iframeDocument.addEventListener("mouseover", (event) => {
      const target = event.target as HTMLElement;
      if (this.hasDirectText(target)) {
        target.addEventListener("mouseenter", () => {
          target.style.border = "1px solid pink";
          target.style.cursor = "pointer";
        });

        target.addEventListener("mouseleave", () => {
          target.style.border = "";
        });
      }
    });
  }

  private updateStatus(status: RSSState["status"]): void {
    this.state.status = status;

    if (status === "loading") {
      this.loadingElement.style.display = "block";
      this.errorElement.style.display = "none";
    } else if (status === "error") {
      this.errorElement.style.display = "block";
      this.loadingElement.style.display = "none";
    } else {
      this.errorElement.style.display = "none";
      this.loadingElement.style.display = "none";
    }
  }

  private createFromTemplate(templateName: keyof Templates): HTMLElement {
    const clone = this.templates[templateName].content.cloneNode(
      true,
    ) as HTMLElement;
    return clone;
  }
}
