/**
 * EventManager
 *
 * Manages all event bindings across the application. This class provides a centralized
 * mechanism to set up, manage, and remove event listeners on specific DOM elements.
 * It is designed to keep event management separate from the actual application logic,
 * which is instead handled by callback functions passed into the constructor.
 *
 * Interactions with Other Classes:
 * - `ViewManager`: The `EventManager` works closely with `ViewManager` by setting up event
 *   listeners for UI interactions specific to views, such as form submissions.
 * - `RSSApp`: `RSSApp` coordinates the instantiation of `EventManager` and provides the appropriate
 *   callback functions for handling each specific event.
 *
 * Usage Example:
 * ```typescript
 * const eventManager = new EventManager(onUrlSubmit, onGenerateFeed, onCopyFeedUrl);
 * eventManager.registerUrlSubmit();
 * eventManager.registerGenerateButton();
 * eventManager.registerDialogEvents();
 * ```
 */
import { store } from "./store";
import getElementPath from "./utils/getElementPath";

export class EventManager {
  private urlForm: HTMLFormElement | null = null;
  private generateButton: HTMLButtonElement | null = null;
  private dialog: HTMLDialogElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private copyButton: HTMLButtonElement | null = null;
  private currentElementClickHandler: EventListener = (event) => {
    const { activeSelector } = store.getState();
    this.handleElementClick(event, activeSelector);
  };

  constructor(
    private onUrlSubmit: (url: string) => Promise<void>,
    private onToggleSelection: (buttonId: string) => Promise<void>,
    private onGenerateFeed: () => Promise<void>,
    private onCopyFeedUrl: () => Promise<void>,
    private updateFeedItems: (elementPath: string, buttonId: string) => void,
  ) {}

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

  public cleanup(): void {
    // Remove form handler
    this.urlForm?.removeEventListener("submit", this.handleUrlSubmit);

    // Remove button handlers
    this.generateButton?.removeEventListener("click", this.handleGenerateFeed);
    this.closeButton?.removeEventListener("click", this.handleDialogClose);
    this.copyButton?.removeEventListener("click", this.handleCopyUrl);

    // Remove dialog click-outside handler
    this.dialog?.removeEventListener("click", this.handleDialogClickOutside);

    // Clear references
    this.urlForm = null;
    this.generateButton = null;
    this.dialog = null;
    this.closeButton = null;
    this.copyButton = null;
  }

  public registerUrlSubmit(): void {
    this.urlForm = document.getElementById("urlForm") as HTMLFormElement;
    if (!this.urlForm) return;

    this.urlForm.addEventListener("submit", this.handleUrlSubmit);
  }

  public registerElementSelectors(): void {
    const targetButtons = document.querySelectorAll(".target");

    targetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.handleToggleSelection(button.id);
      });
    });
  }

  public registerGenerateButton(): void {
    this.generateButton = document.getElementById(
      "generate-feed",
    ) as HTMLButtonElement;
    if (!this.generateButton) return;

    this.generateButton.addEventListener("click", this.handleGenerateFeed);
  }

  public registerDialogEvents(): void {
    this.dialog = document.getElementById("feedDialog") as HTMLDialogElement;
    this.closeButton = document.getElementById("closeBtn") as HTMLButtonElement;
    this.copyButton = document.querySelector(
      ".copy-button",
    ) as HTMLButtonElement;

    if (!this.dialog || !this.closeButton || !this.copyButton) return;

    // Dialog close button
    this.closeButton.addEventListener("click", this.handleDialogClose);

    // Copy button
    this.copyButton.addEventListener("click", this.handleCopyUrl);

    // Click outside dialog to close
    this.dialog.addEventListener("click", this.handleDialogClickOutside);
  }

  public registerIframeEvents(): void {
    const { iframeDocument } = store.getState();

    iframeDocument?.addEventListener("mouseover", (event) => {
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

    iframeDocument!.addEventListener("click", this.currentElementClickHandler);
  }

  public registerIframeEventClear(): void {
    const { iframeDocument } = store.getState();
    iframeDocument!.removeEventListener(
      "click",
      this.currentElementClickHandler,
    );
  }

  public handleUrlSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector("input")?.value;
    if (!input) return;

    await this.onUrlSubmit(input);
  };

  private handleToggleSelection = async (buttonId: string) => {
    this.onToggleSelection(buttonId);
  };

  private handleGenerateFeed = async () => {
    await this.onGenerateFeed();
  };

  private handleDialogClose = () => {
    this.dialog?.close();
  };

  private handleCopyUrl = async () => {
    await this.onCopyFeedUrl();
  };

  private handleDialogClickOutside = (e: MouseEvent) => {
    if (!this.dialog) return;

    const dialogDimensions = this.dialog.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      this.dialog.close();
    }
  };

  private hasDirectText(element: Element): boolean {
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
  }
}
