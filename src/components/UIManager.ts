/**
 * UIManager
 *
 * Responsible for managing core UI elements such as loading and error messages.
 * Provides centralized control over these UI components, making it easy to show
 * or hide loading indicators and error messages. This class is primarily intended
 * to be used across different views to provide a consistent way of managing core
 * UI elements.
 *
 * Interaction with Other Classes:
 * - `RSSApp`: Instantiates `UIManager` and uses its methods to control loading and
 *   error displays based on application state.
 *
 * Usage Example:
 * ```
 * const uiManager = new UIManager();
 * uiManager.showLoading("Loading content...");
 * uiManager.hideLoading();
 * ```
 */
export class UIManager {
  private loadingElement!: HTMLElement;
  private loadingMessageElement!: HTMLElement;
  private errorElement!: HTMLElement;
  private dialog!: HTMLDialogElement;

  constructor() {
    // Initialize DOM elements
    this.errorElement = document.getElementById("error") as HTMLElement;
    this.loadingElement = document.getElementById("loading") as HTMLElement;
    this.dialog = document.getElementById("feedDialog") as HTMLDialogElement;

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
  }

  public showDialog = () => {
    this.dialog.showModal();
  };

  public closeDialog = () => {
    this.dialog.close();
  };

  public async showLoading(message: string) {
    this.loadingElement.style.display = "block";
    await this.updateLoadingMessage(message);
  }

  public hideLoading() {
    this.loadingElement.style.display = "none";
  }

  public showError(message: string) {
    this.errorElement.innerHTML = message;
    this.errorElement.style.display = "block";
  }

  public hideError() {
    this.errorElement.style.display = "none";
  }

  private async updateLoadingMessage(message: string): Promise<void> {
    this.loadingMessageElement.classList.add("active");
    this.loadingMessageElement.textContent = message;
    await this.fadeInOutEffect();
  }

  private async fadeInOutEffect(): Promise<void> {
    this.loadingMessageElement.classList.add("active");
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Wait before fading out
    this.loadingMessageElement.classList.remove("active");
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}
