import * as cheerio from "cheerio";
import { AnalysisResult, FeedItem, FeedItemProperty } from "./types";

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

      // only send sanitized html to client, keep original for parsing
      const $forDisplay = cheerio.load(rawHtml);
      const $ToParse = cheerio.load(rawHtml);

      const sanitizedHtml = this.sanitizeHtml($forDisplay);
      this.html = sanitizedHtml;
      return $ToParse;
    } catch (error) {
      this.log(`Error fetching HTML: ${error}`);
      throw error;
    }
  }

  private sanitizeHtml($: cheerio.Root): string {
    // 1. Remove dangerous elements completely
    const dangerousElements = [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "noscript",
      "meta",
      "base",
    ];

    dangerousElements.forEach((tag) => {
      $(tag).remove();
    });

    // 2. Clean remaining elements
    $("*").each((_, element: cheerio.Element) => {
      const el = $(element);
      const attributes = (
        element as unknown as { attribs: Record<string, string> }
      ).attribs;

      if (attributes) {
        // Remove all on* event handlers and dangerous attributes
        Object.keys(attributes).forEach((attr) => {
          const name = attr.toLowerCase();

          if (
            name.startsWith("on") ||
            name.includes("tracking") ||
            name.includes("analytics") ||
            name.startsWith("data-analytics") ||
            name.startsWith("data-tracking")
          ) {
            el.removeAttr(attr);
          }

          // Clean up hrefs and src
          if (name === "href" || name === "src") {
            const value = attributes[attr].toLowerCase();
            if (
              value.startsWith("javascript:") ||
              (value.startsWith("data:") && !value.startsWith("data:image/"))
            ) {
              el.removeAttr(attr);
            }
          }
        });
      }

      // Remove elements with display:none or visibility:hidden
      const style = el.attr("style") || "";
      if (
        style.includes("display: none") ||
        style.includes("visibility: hidden") ||
        style.includes("opacity: 0")
      ) {
        el.remove();
      }

      // Remove common tracker and comment sections
      const classAndId =
        `${el.attr("class") || ""} ${el.attr("id") || ""}`.toLowerCase();
      if (
        classAndId.match(
          /(comment|tracker|analytics|ad-|advertisement|social-share|newsletter|popup|modal)/,
        )
      ) {
        el.remove();
      }
    });

    // Remove link functionality while keeping the visual structure
    $("a").each((_, element) => {
      const el = $(element);
      // Store the href as a data attribute for reference
      const href = el.attr("href");
      if (href) {
        el.attr("data-href", href);
      }
      // make link unclickable
      el.removeAttr("href");
    });

    return $.html();
  }

  private async trySemanticAnalysis(
    $: cheerio.Root,
  ): Promise<AnalysisResult | null> {
    this.log("Attempting semantic analysis...");

    try {
      let articles = $("article");
      this.log(`Found ${articles.length} article elements`);

      if (articles.length === 0) {
        const mainContent = $("main");
        this.log(`No article elements found, checking main element...`);
        if (mainContent.length) {
          const primarySelectors = [
            "article",
            "section",
            "[role='article']",
            ".post",
            ".entry",
            ".content",
            ".article",
            ".story",
            ".blog-post",
            ".entry-content",
            ".post-content",
          ].join(", ");

          articles = mainContent.find(primarySelectors);
          this.log(`Found ${articles.length} section elements within main`);
        }
      }

      if (articles.length === 0) {
        this.log("No semantic article or section elements found");
        return null;
      }

      const feedItems: FeedItem[] = [];

      articles.each((index, article) => {
        this.log(`Processing article ${index}/${articles.length}`);
        const $article = $(article);
        const item: Partial<FeedItem> = {};

        // Extract title: Check multiple semantic patterns
        const titleSelectors = [
          "h1",
          "h2",
          "h3",
          '[itemprop="headline"]',
          "header h1",
          "header h2",
          ".title",
        ];

        // extract text
        const titleElement = $article.find(titleSelectors.join(", "));
        item.title = {
          text: titleElement.text().trim() || "",
          html: titleElement.prop("outerHTML") || "",
        };

        this.log(
          `Article ${index} - Title found: ${item.title.text ? "Yes" : "No"}`,
        );

        // Extract URL: Look for the main link
        const mainLink =
          $article
            .find("h1 a[href], h2 a[href], h3 a[href], .title a[href]")
            .first() || $article.find("a[href]").first();
        item.url = this.extractUrl($, mainLink);

        this.log(
          `Article ${index} - URL found: ${item.url.text ? "Yes" : "No"}`,
        );

        // Extract date: First look for adjacent time element, then fallback to within article
        let timeElement = $(article).prev("time");
        if (!timeElement.length) {
          // If no adjacent time element, look within the article
          timeElement = $(article)
            .find('time, [itemprop="datePublished"]')
            .first();
        }
        item.date = this.extractDate($, timeElement);
        this.log(
          `Article ${index} - Date found: ${item.date.text ? item.date.text : "No"}`,
        );

        // Extract author: Look for semantic author markers
        const authorSelectors = [
          '[itemprop="author"]',
          '[rel="author"]',
          ".author",
          ".byline",
        ];

        const authorElement = $article.find(authorSelectors.join(", "));
        item.author = {
          text: authorElement.text().trim() || "",
          html: authorElement.prop("outerHTML") || "",
        };
        this.log(
          `Article ${index} - Author found: ${item.author.text ? "Yes" : "No"}`,
        );

        // Extract content: Look for the main content area
        const contentSelectors = [
          '[itemprop="articleBody"]',
          ".content",
          ".entry-content",
          "p",
        ];
        const contentElement = $article
          .find(contentSelectors.join(", "))
          .first();

        // Clone and clean the content
        item.description = {
          text: contentElement.text().trim() || "",
          html: contentElement.prop("outerHTML") || "",
        };

        this.log(
          `Article ${index} - Content length: ${item.description.text.length} characters`,
        );

        // Only add items that have at least a title and a url
        if (item.title.text && item.url.text) {
          feedItems.push(item as FeedItem);
        } else {
          this.log(`Article ${index} - Skipped (no title or content)`);
        }
      });

      if (feedItems.length > 0) {
        this.log(
          `Semantic analysis complete - Found ${feedItems.length} valid feed items`,
        );

        return {
          items: feedItems,
          source: "semantic-analysis",
          logs: this.logs,
          html: this.html,
        };
      }

      this.log("Semantic analysis complete - No valid feed items found");

      return null;
    } catch (error) {
      this.log(`Error in semantic analysis: ${error}`);
      return null;
    }
  }

  private extractUrl(
    $: cheerio.Root,
    urlElement: cheerio.Cheerio,
  ): FeedItemProperty {
    const href =
      urlElement.attr("href") ||
      $('link[rel="canonical"]').attr("href") ||
      $('meta[property="og:url"]').attr("content");

    if (!href) {
      return { text: "", html: "" };
    }

    try {
      return {
        text: new URL(href, this.siteUrl).toString(),
        html: urlElement.prop("outerHTML"),
      };
    } catch (e) {
      this.log(`Invalid URL: ${href}`);
      return { text: "", html: "" };
    }
  }

  private extractDate(
    $: cheerio.Root,
    element: cheerio.Cheerio,
  ): FeedItemProperty {
    if (element.length === 0) return { text: "", html: "" };

    // Try multiple date sources
    const dateStr =
      element.attr("datetime") ||
      element.attr("content") ||
      $('meta[property="article:published_time"]').attr("content") ||
      element.text().trim();

    try {
      const parsed = new Date(dateStr);
      return {
        text: parsed.toISOString(),
        html: element.prop("outerHTML") || "",
      };
    } catch (e) {
      this.log(`Invalid date: ${dateStr}`);
      return { text: "", html: "" };
    }
  }

  private getFullUrl(url: string): string {
    if (!url.startsWith("http")) {
      return this.siteUrl + url;
    }

    return url;
  }

  private async requestLlmAssistance(
    $: cheerio.Root,
  ): Promise<AnalysisResult | null> {
    this.log("Attempting GPT-3.5 Turbo analysis...");

    try {
      // Clone body and clean it
      const $content = $("body").clone();
      $content
        .find(
          'nav, header, footer, script, style, noscript, iframe, [class*="nav"], [class*="header"], [class*="footer"], [role="navigation"]',
        )
        .remove();

      // Get cleaned HTML
      const sampleContent = $content.html() || "";

      const prompt = `You are a feed analyzer that identifies patterns in HTML to extract RSS feed items. Analyze this HTML sample and identify the repeating structure for feed items.

Page URL: ${this.siteUrl}

I need to reliably extract:
- Title
- URL
- Publication date (if available)
- Author (if available)
- Content/description (if available)

Calculate confidence score (0.0-1.0) based on:
- How consistent the HTML structure is across items
- Whether clear semantic markers or classes exist
- Quality of item separation (clear containers)
- Presence of required fields (title, url, date)
- Reliability of date formats
- Whether content areas are clearly defined

IMPORTANT: Respond with ONLY the raw JSON object, no markdown, no code blocks, no explanation. The response must be valid JSON in this format:

{
  "pattern": "description of the content pattern",
  "selectors": {
    "container": "selector for each item container",
    "title": "selector for title",
    "link": "selector for URL",
    "date": "selector for date",
    "author": "selector for author",
    "content": "selector for content"
  },
  "confidence": 0.0-1.0,
  "parsing_notes": "any special instructions"
}

HTML sample:
${sampleContent}`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert at analyzing HTML structure and identifying patterns for RSS feed generation.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `GPT API call failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const analysis = await response.json();
      const llmResponse = analysis.choices[0].message.content;

      try {
        const llmSuggestions = JSON.parse(llmResponse);

        if (llmSuggestions.confidence < 0.6) {
          this.log("GPT confidence too low, skipping results");
          return null;
        }

        // Extract items using suggested selectors
        const items: FeedItem[] = [];
        $(llmSuggestions.selectors.container).each((_, element) => {
          const $item = $(element);

          // Try to get absolute URL
          const rawUrl = $item.find(llmSuggestions.selectors.link).attr("href");
          const absoluteUrl = rawUrl ? this.getFullUrl(rawUrl) : "";

          const item: FeedItem = {
            title: {
              text: $item.find(llmSuggestions.selectors.title).text().trim(),
              html: $item.find(llmSuggestions.selectors.title).html() || "",
            },
            url: {
              text: absoluteUrl,
              html:
                $item.find(llmSuggestions.selectors.link).prop("outerHTML") ||
                "",
            },
            date: {
              text: $item.find(llmSuggestions.selectors.date).text().trim(),
              html: $item.find(llmSuggestions.selectors.date).html() || "",
            },
            author: {
              text: $item.find(llmSuggestions.selectors.author).text().trim(),
              html: $item.find(llmSuggestions.selectors.author).html() || "",
            },
            description: {
              text: $item.find(llmSuggestions.selectors.content).text().trim(),
              html: $item.find(llmSuggestions.selectors.content).html() || "",
            },
          };

          if (item.title.text && item.url.text) {
            items.push(item);
          }
        });

        if (items.length > 0) {
          return {
            items,
            source: "gpt-analysis",
            logs: this.logs,
            html: this.html,
          };
        }
      } catch (error) {
        this.log(`Error parsing GPT response: ${error}`);
      }

      return null;
    } catch (error) {
      this.log(`GPT analysis failed: ${error}`);
      return null;
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