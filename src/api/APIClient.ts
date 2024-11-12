import { APIError, AnalysisResponse } from "@/types";

export class APIClient {
  private static readonly BASE_URL = "/api";

  /**
   * Makes a fetch request with standardized error handling and response processing
   */
  private static async fetchWrapper<T>(
    endpoint: string,
    options: RequestInit = {},
    responseType: "json" | "text" = "json",
  ): Promise<T> {
    const url = `${this.BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = new Error() as APIError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.type = "http";
        error.message = `HTTP error! status: ${response.status}`;
        throw error;
      }

      return responseType === "json" ? response.json() : (response.text() as T);
    } catch (error) {
      // If it's already an APIError, rethrow it
      if ((error as APIError).type) {
        throw error;
      }

      // Otherwise, it's likely a network error
      const apiError = new Error() as APIError;
      apiError.type = "network";
      apiError.message = "Network request failed";
      throw apiError;
    }
  }

  /**
   * Analyzes a website's structure to extract potential RSS feed items
   */
  public static async analyzeWebsite(url: string): Promise<AnalysisResponse> {
    return this.fetchWrapper<AnalysisResponse>(
      `/analyze/${encodeURIComponent(url)}`,
      {},
      "json",
    );
  }

  /**
   * Checks if a URL is valid and accessible
   * @throws APIError with type 'network' or 'http'
   */
  public static async checkUrl(url: string): Promise<string> {
    try {
      await this.fetchWrapper(
        `/check-url/${encodeURIComponent(url)}`,
        { method: "GET" },
        "json",
      );
      return url;
    } catch (error) {
      if ((error as APIError).type === "network") {
        throw error; // Rethrow network errors
      }
      // For HTTP errors, we want to indicate the site is unavailable
      const apiError = new Error() as APIError;
      apiError.type = "http";
      apiError.message = "Website unavailable";
      throw apiError;
    }
  }

  /**
   * Generates an RSS feed from the provided feed items
   * Returns the feed URL as a string
   */
  public static async generateFeed(
    feedItems: any[],
    siteUrl: string,
  ): Promise<string> {
    return this.fetchWrapper<string>(
      "/generate-feed",
      {
        method: "POST",
        body: JSON.stringify({
          feedItems,
          siteUrl,
        }),
      },
      "text",
    );
  }
}
