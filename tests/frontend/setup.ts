import "@testing-library/jest-dom";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { resolve } from "path";
import { beforeEach } from "vitest";

// read the HTML content from index.html
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");

// load css
const css = readFileSync(
  resolve(__dirname, "../../src/css/styles.css"),
  "utf8",
);

// Initialize JSDOM with HTML content
const dom = new JSDOM(html);

// Declare global types
declare global {
  var window: Window & typeof globalThis;
  var document: Document;
  var HTMLElement: typeof HTMLElement;
  var HTMLFormElement: typeof HTMLFormElement;
  var HTMLTemplateElement: typeof HTMLTemplateElement;
}

// Setup global variables to simulate the browser environment
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLFormElement = dom.window.HTMLFormElement;
global.HTMLTemplateElement = dom.window.HTMLTemplateElement;

beforeEach(() => {
  // Restore the original DOM structure before each test
  document.body.innerHTML = html;

  // Add CSS
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
});
