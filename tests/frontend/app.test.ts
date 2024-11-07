import { RSSApp } from "@/app";
import { beforeEach, describe, it, expect, vi } from "vitest";

describe("RSSApp state management", () => {
  let app: RSSApp;

  beforeEach(() => {
    app = new RSSApp();
    vi.restoreAllMocks();
  });

  it("initializes with correct default state", () => {
    expect(document.getElementById("urlForm")).toBeVisible();
    expect(document.getElementById("loading")).not.toBeVisible();
    expect(document.getElementById("error")).not.toBeVisible();
    expect(document.getElementById("rss-mapping-container")).not.toBeVisible();
  });

  it("shows loading state when form is submitted", async () => {
    // mock fetch
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ succes: true, message: "analyzed website" }),
      }),
    );

    submitForm("https://example.com");

    await vi.waitFor(() => {
      expect(document.getElementById("loading")).toBeVisible();
      expect(document.getElementById("error")).not.toBeVisible();
      expect(document.getElementById("urlForm")).toBeVisible();
    });
  });

  it("shows error when analysis fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Fetch failed"));

    submitForm("https://example.com");

    await vi.waitFor(() => {
      expect(document.getElementById("error")).toBeVisible();
      expect(document.getElementById("loading")).not.toBeVisible();
      expect(document.getElementById("urlForm")).toBeVisible();
    });
  });
});

describe("RSSApp url validation", () => {
  let app: RSSApp;

  beforeEach(() => {
    app = new RSSApp();
    vi.restoreAllMocks();
  });

  it("rejects empty url", () => {
    submitForm("");
    expect(document.getElementById("validationMessage")).toHaveTextContent(
      "Please enter a valid URL, including https://",
    );
  });

  it("rejects non-url input", () => {
    submitForm("boo");
    expect(document.getElementById("validationMessage")).toHaveTextContent(
      "Please enter a valid URL, including https://",
    );
  });
});

const submitForm = (userInput: string) => {
  const form = document.getElementById("urlForm") as HTMLFormElement;
  const input = document.querySelector("input") as HTMLInputElement;

  // set input value
  input.value = userInput;

  // create and dispatch submit event
  const submitEvent = new Event("submit");
  form.dispatchEvent(submitEvent);
};
