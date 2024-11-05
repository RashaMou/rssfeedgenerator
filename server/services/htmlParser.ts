import * as cheerio from "cheerio";
import { AnalysisResult } from "./types";

export class HtmlParser {
  private logs: string[] = [];
  private siteUrl: string;
  private html: string;

  private log(message: string): void {
    this.logs.push(`[FeedAnalyzer] ${message}`);
  }

  constructor(siteUrl: string) {
    this.siteUrl = siteUrl;
    this.html = "";
  }

  private async extractHtml(url: string): Promise<cheerio.Root> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/html",
          "User-Agent":
            "Mozilla/5.0 (compatible; Chromium/118.0; Windows NT 10.0) " +
            "RSSFeedCreator/1.0 (+https://rssfeedcreator.com; contact@rssfeedcreator.com)",
          "Accept-Encoding": "gzip, deflate, br",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new Error(
          `Network response was not ok: ${response.status} ${response.statusText}`,
        );
      }

      const rawHtml = await response.text();
      const $ = cheerio.load(rawHtml);
      return $;
    } catch (error) {
      this.log(`Error fetching HTML: ${error}`);
      throw error;
    }
  }

  public async analyze(): Promise<AnalysisResult | null> {
    this.logs = [];
    try {
      const $ = await this.extractHtml(this.siteUrl);

      const result =
        (await this.trySemanticAnalysis($)) || this.requestLlmAssistance($);

      if (result) {
        console.log("Parsing logs");
        return result;
      }

      return {
        items: [],
        logs: this.logs,
        html: "",
      };
    } catch (error) {
      this.log(`Analysis failed: ${error}`);
      return { items: [], logs: this.logs, html: "" };
    }
  }
}
