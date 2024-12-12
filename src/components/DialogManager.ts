/**
 * DialogManager
 *
 * Manages the display and interactions for dialogs within the application.
 * This class provides methods to open and close dialogs, along with handling
 * specific interactions such as closing the dialog when clicking outside it.
 * Centralizes dialog control to ensure consistent behavior across the application.
 *
 * Interaction with Other Classes:
 * - `RSSApp`: Instantiates `DialogManager` and calls its methods to show or hide
 *   dialogs as needed (e.g., after generating an RSS feed link).
 * - `UIManager`: May use `UIManager` to display loading or error states when
 *   showing dialogs involves processing.
 *
 * Usage Example:
 * ```
 * const dialogManager = new DialogManager();
 * dialogManager.show();
 * dialogManager.close();
 * ```
 */
export class DialogManager {
  private dialog: HTMLDialogElement;

  constructor() {
    this.dialog = document.getElementById("feedDialog") as HTMLDialogElement;

    if (!this.dialog) {
      throw new Error("Dialog element not found");
    }

    // Close dialog on outside click
    this.dialog.addEventListener("click", (e) => {
      const dialogDimensions = this.dialog.getBoundingClientRect();
      if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
      ) {
        this.close();
      }
    });
  }

  public show() {
    this.dialog.showModal();
  }

  public close() {
    this.dialog.close();
  }
}
