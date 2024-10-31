interface RSSState {
  status: "input" | "loading" | "error" | "mapping";
  currentUrl: string;
  mappings: RSSMappings;
  preview: string | null;
}

interface Templates {
  websitePreview: HTMLTemplateElement;
  elementMapping: HTMLTemplateElement;
  rssPreview: HTMLTemplateElement;
  mappingFields: HTMLTemplateElement;
}

interface RSSMappings {
  title: string;
  date: string;
  content: string;
  author: string;
}

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
    // Implement url submission handling
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
