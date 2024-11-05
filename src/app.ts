import { RSSState, Templates } from "./types";

export class RSSApp {
  private state: RSSState;
  private mappingContainer!: HTMLElement;
  private urlForm!: HTMLFormElement;
  private loadingElement!: HTMLElement;
  private errorElement!: HTMLElement;
  private templates!: Templates;

  constructor() {
    this.state = {
      status: "input",
      currentUrl: "",
      preview: null,
      iframeDocument: null,
      feedItems: [],
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
          this.state.feedItems = analysisResult.result.items;
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
      this.mappingContainer.appendChild(websitePreviewClone);
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

    // rss preview
    const rssPreviewClone = this.createFromTemplate("rssPreview");
    const feedItemsDiv = rssPreviewClone.querySelector("#feedItems");

    if (!feedItemsDiv) {
      console.error("Feed items container not found in template");
      return;
    }

    this.state.feedItems.forEach((feedItem) => {
      const itemDiv = document.createElement("div");

      const fields = {
        title: feedItem.title.text,
        author: feedItem.author.text,
        date: feedItem.date.text,
        url: feedItem.url.text,
        description: feedItem.description.text,
      };

      for (const [fieldName, content] of Object.entries(fields)) {
        const fieldElement = this.createFromTemplate("feedFields");
        const nameElement = fieldElement.querySelector(".field-name");
        const contentElement = fieldElement.querySelector(".field-content");

        if (nameElement && contentElement) {
          nameElement.textContent = fieldName;
          contentElement.textContent = content || `No ${fieldName} found`;
          itemDiv.appendChild(fieldElement);
        }
      }

      feedItemsDiv.appendChild(itemDiv);
    });

    this.mappingContainer.appendChild(rssPreviewClone);
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
