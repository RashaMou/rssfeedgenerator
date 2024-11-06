import { RSSState, Templates } from "./types";
import getElementPath from "./utils/getElementPath";

export class RSSApp {
  private state: RSSState;
  private mappingContainer!: HTMLElement;
  private urlForm!: HTMLFormElement;
  private loadingElement!: HTMLElement;
  private errorElement!: HTMLElement;
  private templates!: Templates;
  private currentElementClickHandler: EventListener = (event) =>
    this.handleElementClick(event, this.state.activeSelector);

  constructor() {
    this.state = {
      status: "input",
      currentUrl: "",
      preview: null,
      iframeDocument: null,
      originalFeedItems: [],
      currentFeedItems: [],
      selectionMode: false,
      activeSelector: "",
      html: "",
    };

    this.init();
  }

  private init(): void {
    // Initialize DOM elements
    const urlFormElement = document.getElementById("urlForm") as HTMLElement;
    const mappingContainerElement = document.querySelector(
      ".rss-mapping-container",
    ) as HTMLElement;
    const loadingElement = document.getElementById("loading") as HTMLElement;
    const errorElement = document.getElementById("error") as HTMLElement;

    // Type guard DOM elements
    if (
      !mappingContainerElement ||
      !urlFormElement ||
      !loadingElement ||
      !errorElement
    ) {
      throw new Error("Required DOM elements not found");
    }

    // Check if urlForm is actually a form
    if (!(urlFormElement instanceof HTMLFormElement)) {
      throw new Error("URL form element is not a form");
    }

    this.mappingContainer = mappingContainerElement;
    this.urlForm = urlFormElement;
    this.loadingElement = loadingElement;
    this.errorElement = errorElement;

    // Initialize templates
    this.templates = {
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
      !this.templates.websitePreview ||
      !this.templates.elementMapping ||
      !this.templates.feedFields ||
      !this.templates.rssPreview
    ) {
      throw new Error("Required template elements not found");
    }

    // Setup form submission handling
    this.setupEventListeners();
  }

  STATUS_CONFIG = {
    loading: {
      show: ["loadingElement"],
      hide: ["errorElement", "urlForm", "mappingContainer"],
    },
    error: {
      show: ["errorElement"],
      hide: ["loadingElement", "urlForm", "mappingContainer"],
    },
    mapping: {
      show: ["mappingContainer"],
      hide: ["urlForm", "loadingElement", "errorElement"],
    },
    input: {
      show: ["urlForm"],
      hide: ["loadingElement", "errorElement", "mappingContainer"],
    },
  } as const;

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

  private setupEventListeners() {
    this.urlForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleUrlSubmit(e);
    });
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

    const selectedElement = event.target as HTMLElement;
    console.log("We selected element:", selectedElement.textContent);
    const elementPath = getElementPath(selectedElement);

    const pathTextContainer = document.getElementById(`${buttonId}-path`);
    console.log("pathTextContainer", pathTextContainer);
    pathTextContainer!.textContent = elementPath;

    this.updateFeedItems(elementPath, buttonId);
  }

  private updateFeedItems(elementPath: string, mappingFieldName: string) {
    console.log("SelectionMode is", this.state.selectionMode);
    console.log("we are updating feed items for:", mappingFieldName);
    console.log("element path:", elementPath);
    const similarElements =
      this.state.iframeDocument!.querySelectorAll(elementPath);
    this.state.currentFeedItems = this.state.originalFeedItems.map(
      (item, index) => {
        return {
          ...item,
          [mappingFieldName]: similarElements[index]?.textContent?.trim() || "",
        };
      },
    );

    this.renderRssPreview();
  }

  private renderRssPreview() {
    const feedItemsDiv = document.querySelector("#feedItems");
    if (!feedItemsDiv) {
      console.log("No feed items div found");
      return;
    }

    // Clear existing content
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

    this.state.currentUrl = input;

    if (isValid) {
      try {
        this.updateStatus("loading");

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

        if (analysisResult.success) {
          this.updateStatus("input");
          this.state.originalFeedItems = this.state.currentFeedItems =
            analysisResult.result.items;
          this.mountMappingTemplates(String(analysisResult.result.html));
        }
      } catch (err) {
        this.updateStatus("error");
        console.error("Analysis Failed:", err);
      }
    }
  }

  private mountMappingTemplates(html: string): void {
    // Element mapping
    const elementMappingClone = this.createFromTemplate("elementMapping");
    this.mappingContainer.appendChild(elementMappingClone);

    // setup element selection buttons
    const targetButtons = document.querySelectorAll(".target");
    targetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        console.log("button was clicked:", button.id);
        this.toggleSelectionMode(button.id);
      });
    });

    // website preview
    const websitePreviewClone = this.createFromTemplate("websitePreview");
    console.log("website preview clone", websitePreviewClone);

    const iframe = websitePreviewClone.querySelector(
      "#website-preview-iframe",
    ) as HTMLIFrameElement;

    if (iframe) {
      console.log("iframe", iframe);
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
        this.updateStatus("mapping");
      };
    } else {
      console.log("iframe element not found in the cloned template.");
    }

    this.mappingContainer.appendChild(websitePreviewClone);

    // rss preview
    const rssPreviewClone = this.createFromTemplate("rssPreview");
    this.mappingContainer.appendChild(rssPreviewClone);

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

      const response = await fetch("/api/generate-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedItems: this.state.currentFeedItems,
          siteUrl: this.state.currentUrl,
        }),
      });

      const feedLink = await response.text();
      console.log("feedlink", feedLink);
      const feedLinkElement = document.createElement("a");
      feedLinkElement.href = feedLink;
      feedLinkElement.textContent = "View RSS Feed";
      this.mappingContainer.appendChild(feedLinkElement);
    });
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

    const config = this.STATUS_CONFIG[status] || this.STATUS_CONFIG.input;

    const elements = {
      loadingElement: this.loadingElement,
      errorElement: this.errorElement,
      urlForm: this.urlForm,
      mappingContainer: this.mappingContainer,
    };

    config.show.forEach((elementName) => {
      const element = elements[elementName];
      if (element) {
        element.classList.remove("hidden");
        element.classList.add("active");
      }
    });

    config.hide.forEach((elementName) => {
      const element = elements[elementName];
      if (element) {
        element.classList.add("hidden");
        element.classList.remove("active");
      }
    });
  }

  private createFromTemplate(templateName: keyof Templates): HTMLElement {
    const clone = this.templates[templateName].content.cloneNode(
      true,
    ) as HTMLElement;
    return clone;
  }
}
