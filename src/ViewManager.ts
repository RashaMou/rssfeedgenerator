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
import { UIManager } from "./UIManager";

export class ViewManager {
  private templateManager: TemplateManager;
  private uiManager: UIManager;
  private eventManager: EventManager;

  constructor(
    eventManager: EventManager,
    uiManager: UIManager,
    templateManager: TemplateManager,
  ) {
    this.uiManager = uiManager;
    this.templateManager = templateManager;
    this.eventManager = eventManager;
  }

  public renderHomeView() {
    const inputClone = this.templateManager.createFromTemplate("inputTemplate");
    const contentContainer = document.getElementById("content");

    if (contentContainer) {
      console.log("we got the content container");
      contentContainer.innerHTML = "";
      contentContainer.appendChild(inputClone);
    } else {
      this.uiManager.showError("Content container not found");
    }

    this.eventManager.registerUrlSubmit();
  }
}
