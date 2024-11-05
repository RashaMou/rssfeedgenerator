import { RSSState, Templates } from "./types";

export class RSSApp {
  private state: RSSState;
  private container!: HTMLElement;
  private urlForm!: HTMLFormElement;
  private loadingElement!: HTMLElement;
  private errorElement!: HTMLElement;
  private templates!: Templates;

  constructor() {
    this.state = {
      status: "input",
      currentUrl: "",
      mappings: {
        title: ".post-title",
        date: ".post-date",
        content: ".post-content",
        author: ".post-author",
      },
      preview: null,
    };

    this.init();
  }

  private init(): void {
    // Initialize DOM elements
    const urlFormElement = document.getElementById("urlForm") as HTMLElement;
    const containerElement = document.querySelector(
      ".rss-mapping-container",
    ) as HTMLElement;
    const loadingElement = document.getElementById("loading") as HTMLElement;
    const errorElement = document.getElementById("error") as HTMLElement;

    // Type guard DOM elements
    if (
      !containerElement ||
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

    this.container = containerElement;
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
      mappingFields: document.getElementById(
        "mapping-field-template",
      ) as HTMLTemplateElement,
      rssPreview: document.getElementById(
        "mapping-field-template",
      ) as HTMLTemplateElement,
    };

    // Type guard templates
    if (
      !this.templates.websitePreview ||
      !this.templates.elementMapping ||
      !this.templates.mappingFields ||
      !this.templates.rssPreview
    ) {
      throw new Error("Required template elements not found");
    }

    // Setup form submission handling
    this.setupEventListeners();
  }

  private validateUrl(url: string): boolean {
    let isValid = false;

    const validationMessageElement = document.getElementById(
      "validationMessage",
    ) as HTMLElement;

    try {
      new URL(url);
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

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const analysisResult = await response.json();

        if (analysisResult.success) {
          console.log(analysisResult.message);
          this.updateStatus("input");
        }
      } catch (err) {
        this.updateStatus("error");
        console.error("Analysis Failed:", err);
      }
    }
  }

  private updateStatus(status: RSSState["status"]): void {
    this.state.status = status;

    // show appropriate element
    switch (status) {
      case "loading":
        this.loadingElement.classList.remove("hidden");
        this.loadingElement.classList.add("active");
        this.errorElement.classList.remove("active");
        this.errorElement.classList.add("hidden");
        break;
      case "error":
        this.errorElement.classList.remove("hidden");
        this.errorElement.classList.add("active");
        this.loadingElement.classList.remove("active");
        this.loadingElement.classList.add("hidden");
        break;
      case "mapping":
        this.urlForm.classList.add("hidden");
        this.loadingElement.classList.add("hidden");
        this.loadingElement.classList.remove("active");
        this.errorElement.classList.add("hidden");
        this.errorElement.classList.remove("active");
        break;
      default:
      case "input":
        this.urlForm.classList.remove("hidden");
        this.urlForm.style.display = "block";
        this.loadingElement.classList.add("hidden");
        this.loadingElement.classList.remove("active");
        this.errorElement.classList.add("hidden");
        this.errorElement.classList.remove("active");
    }
  }

  private createFromTemplate(templateName: keyof Templates): HTMLElement {
    const clone = this.templates[templateName].content.cloneNode(
      true,
    ) as HTMLElement;
    return clone;
  }

  private setupMappingComponents(): void {
    // create the website preview, element mapping, and rss preview sections from templates
    // populate them with content and append them to the rss-mapping-container
  }

  private setupMappingFields(): void {
    // create the mapping fields from the templates, populate them with content
    // and append them to the rss-mapping-container
  }

  private setupMappingEventListeners(): void {
    // event listeners for mapping fields interactions
  }
}
