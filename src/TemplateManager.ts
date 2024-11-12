/**
 * TemplateManager
 *
 * Manages HTML templates within the application by loading them into memory and
 * providing a method to create clones of these templates.
 *
 * The `TemplateManager` pre-loads templates into a map, allowing other classes
 * to create instances of the templates by their ID.
 *
 * Interaction with Other Classes:
 * - `ViewManager`: Uses `TemplateManager` to dynamically render views by creating
 *   instances of templated components (e.g., input forms, previews).
 *
 * Usage Example:
 * ```
 * const templateManager = new TemplateManager();
 * templateManager.initialize();
 * const inputForm = templateManager.createFromTemplate("inputTemplate");
 * ```
 */
export class TemplateManager {
  private templates: Map<string, HTMLTemplateElement> = new Map();

  public initialize() {
    const templates = [
      "inputTemplate",
      "websitePreviewTemplate",
      "elementMappingTemplate",
      "rssPreviewTemplate",
      "feedFieldTemplate",
    ];
    templates.forEach((id) => {
      const template = document.getElementById(id);
      if (template) {
        this.templates.set(id, template as HTMLTemplateElement);
      }
    });
  }

  public createFromTemplate(id: string): HTMLElement {
    const template = this.templates.get(id); // undefined
    if (!template) throw new Error(`${id} not found`);
    return template.content.cloneNode(true) as HTMLElement;
  }
}
