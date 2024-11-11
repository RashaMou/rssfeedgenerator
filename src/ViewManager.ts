/**
 * ViewManager
 *
 * Responsible for initializing and managing different views within the application,
 * such as the home view and the mapping view. This class sets up each view with
 * necessary elements, templates, and event listeners, providing a modular approach
 * to managing UI screens.
 *
 * Interaction with Other Classes:
 * - `TemplateManager`: Relies on `TemplateManager` to clone and use pre-defined
 *   templates for rendering UI elements in each view.
 * - `RSSApp`: `RSSApp` initializes `ViewManager` and calls methods to set up
 *   specific views based on the application flow.
 *
 * Usage Example:
 * ```
 * const viewManager = new ViewManager(uiManager);
 * viewManager.initializeHomeView();
 * ```
 */
import { EventManager } from "./EventManager";
import { TemplateManager } from "./TemplateManager";
import { RSSState } from "./types";
import { UIManager } from "./UIManager";
import { FeedItem } from "server/services/types";

export class ViewManager {
  private templateManager: TemplateManager;
  private uiManager: UIManager;
  private eventManager: EventManager;
  private state: RSSState;

  constructor(
    eventManager: EventManager,
    uiManager: UIManager,
    templateManager: TemplateManager,
    state: RSSState,
  ) {
    this.uiManager = uiManager;
    this.templateManager = templateManager;
    this.eventManager = eventManager;
    this.state = state;
  }

  public renderHomeView() {
    const inputClone = this.templateManager.createFromTemplate("inputTemplate");
    const contentContainer = document.getElementById("content");

    if (contentContainer) {
      contentContainer.innerHTML = "";
      contentContainer.appendChild(inputClone);
    } else {
      this.uiManager.showError("Content container not found");
    }

    this.eventManager.registerUrlSubmit();
  }

  public renderMappingView(html: string): void {
    const contentContainer = document.getElementById("content");

    if (!contentContainer) {
      console.error("Content container not found");
      return;
    }

    contentContainer.innerHTML = "";

    const mappingContainer = document.querySelector(
      ".rss-mapping-container",
    ) as HTMLElement;

    // Element mapping
    const elementMappingClone = this.templateManager.createFromTemplate(
      "elementMappingTemplate",
    );

    // website preview
    const websitePreviewClone = this.templateManager.createFromTemplate(
      "websitePreviewTemplate",
    );

    // rss preview
    const rssPreviewClone =
      this.templateManager.createFromTemplate("rssPreviewTemplate");

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

        this.eventManager.registerIframeEventListeners();
      };
    } else {
      console.error("iframe element not found in the cloned template.");
    }
    mappingContainer.appendChild(elementMappingClone);
    mappingContainer.appendChild(websitePreviewClone);
    mappingContainer.appendChild(rssPreviewClone);
  }

  public renderRssPreview() {
    const feedItemsDiv = document.querySelector("#feedItems");

    if (!feedItemsDiv) {
      console.error("No feed items div found");
      return;
    }

    feedItemsDiv.innerHTML = "";

    this.state.currentFeedItems.forEach((feedItem: FeedItem) => {
      const itemDiv = document.createElement("div");

      const fields = {
        title: feedItem.title,
        author: feedItem.author,
        date: feedItem.date,
        link: feedItem.link,
        description: feedItem.description,
      };

      for (const [fieldName, content] of Object.entries(fields)) {
        const fieldElement =
          this.templateManager.createFromTemplate("feedFields");
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
}
