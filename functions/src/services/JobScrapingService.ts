import axios from "axios";
import * as cheerio from "cheerio";
import * as logger from "firebase-functions/logger";
import {JobPostData} from "../types/JobPostData";

export class JobScrapingService {
  private readonly USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  async expandTinyUrl(tinyUrlId: string): Promise<string> {
    try {
      const tinyUrl = `https://tinyurl.com/${tinyUrlId}`;
      logger.info("Attempting to expand TinyURL", {tinyUrl});

      const response = await axios.get(tinyUrl, {
        maxRedirects: 0,
        validateStatus: (status: number) => status === 302 || status === 301 || status === 200,
        timeout: 10000,
      });

      if (response.headers.location) {
        return response.headers.location;
      }

      return tinyUrl;
    } catch (error: any) {
      logger.warn("Failed to expand TinyURL", {tinyUrlId, error: error.message});

      if (error.response?.headers?.location) {
        return error.response.headers.location;
      }

      return `https://tinyurl.com/${tinyUrlId}`;
    }
  }

  async scrapeJobPost(url: string): Promise<JobPostData | null> {
    try {
      const response = await axios.get(url, {
        headers: {"User-Agent": this.USER_AGENT},
      });

      const $ = cheerio.load(response.data);
      this.logPageStructure($);

      if (url.includes("linkedin.com")) {
        return this.scrapeLinkedIn($);
      } else if (url.includes("indeed.com")) {
        return this.scrapeIndeed($);
      } else if (url.includes("myworkdayjobs.com")) {
        return this.scrapeWorkday($, url);
      } else {
        return this.scrapeGeneric($);
      }
    } catch (error) {
      logger.error("Error scraping job post", {url, error});
      return null;
    }
  }

  private logPageStructure($: cheerio.CheerioAPI): void {
    logger.info("Page structure", {
      title: $("title").text(),
      h1Elements: $("h1").map((_, el) => $(el).text()).get(),
      h2Elements: $("h2").map((_, el) => $(el).text()).get(),
    });
  }

  private scrapeLinkedIn($: cheerio.CheerioAPI): JobPostData {
    const companyName = $("a[data-tracking-control-name='job-details-job-info-company-name'] h4").text().trim() ||
                       $(".job-details-jobs-unified-top-card__company-name a").text().trim() ||
                       $(".jobs-unified-top-card__company-name a").text().trim();

    const jobTitle = $("h1.jobs-unified-top-card__job-title").text().trim() ||
                    $("h2[data-tracking-control-name='public_jobs_job-title']").text().trim();

    const jobDescription = $(".jobs-description-content__text").text().trim() ||
                          $(".jobs-box__html-content").text().trim();

    return this.createJobPostData(companyName, jobTitle, jobDescription, "", "");
  }

  private scrapeIndeed($: cheerio.CheerioAPI): JobPostData {
    const companyName = $("div[data-testid='inlineHeader-companyName'] a").text().trim() ||
                       $(".jobsearch-CompanyInfoContainer a").text().trim();

    const jobTitle = $("h1[data-testid='jobsearch-JobInfoHeader-title']").text().trim() ||
                    $(".jobsearch-JobInfoHeader-title").text().trim();

    const jobDescription = $("div[data-testid='jobsearch-jobDescriptionText']").text().trim() ||
                          $("#jobDescriptionText").text().trim();

    return this.createJobPostData(companyName, jobTitle, jobDescription, "", "");
  }

  private scrapeWorkday($: cheerio.CheerioAPI, url: string): JobPostData {
    const urlMatch = url.match(/\/\/(.*?)\.myworkdayjobs\.com/);
    const companyFromUrl = urlMatch?.[1];

    const companyMappings: {[key: string]: string} = {
      "hp": "HP Inc.",
      "microsoft": "Microsoft",
      "google": "Google",
      "amazon": "Amazon",
      // Add more mappings as needed
    };

    const companyName = companyMappings[companyFromUrl?.toLowerCase() || ""] ||
                       (companyFromUrl ? companyFromUrl.replace(/\.wd\d+/i, "").toUpperCase() + " Inc." : "") ||
                       $("title").text().split(" - ")[0]?.trim() ||
                       "Unknown Company";

    const urlParts = url.split("/");
    const jobRolePart = urlParts.find((part) =>
      part.includes("-") &&
      part.length > 15 &&
      !part.includes("Texas") &&
      !part.includes("United-States") &&
      !part.includes("Spring")
    );

    const jobTitleFromUrl = jobRolePart?.replace(/_\d+(\?.*)?$/, "").replace(/-/g, " ");

    let jobTitle = $("[data-automation-id='jobPostingHeader']").text().trim() ||
                   $("h1").first().text().trim() ||
                   $("title").text().split(" - ")[1]?.trim() ||
                   (jobTitleFromUrl ? this.formatJobTitle(jobTitleFromUrl) : "") ||
                   "Software Development Position";

    jobTitle = jobTitle.replace(/[?&].*$/, "").replace(/_\d+.*$/, "").replace(/\s+/g, " ").trim();

    const jobDescription = $("[data-automation-id='jobPostingDescription']").text().trim() ||
                          $(".jobPostingDescription").text().trim() ||
                          $("[data-automation-id='jobDescription']").text().trim() ||
                          `Join ${companyName} as a ${jobTitle}. This position offers exciting opportunities to work with cutting-edge technology and make a meaningful impact.`;

    return this.createJobPostData(companyName, jobTitle, jobDescription, "", url);
  }

  private scrapeGeneric($: cheerio.CheerioAPI): JobPostData | null {
    const companyName = this.findCompanyName($);
    const jobTitle = $("h1").first().text().trim() || $("title").text().trim();
    const jobDescription = $("main").text().trim() ||
                          $(".content").text().trim() ||
                          $("article").text().trim() ||
                          $("body").text().trim();

    if (!companyName && !jobTitle && !jobDescription) {
      return null;
    }

    return this.createJobPostData(companyName, jobTitle, jobDescription, "", "");
  }

  private findCompanyName($: cheerio.CheerioAPI): string {
    const companyElements = $("h1, h2, h3");
    let foundCompanyName = "";
    
    companyElements.each((_, element) => {
      const text = $(element).text().toLowerCase();
      if (text.includes("company") || text.includes("employer")) {
        foundCompanyName = $(element).text().trim();
        return false;
      }
      return true;
    });
    
    return foundCompanyName;
  }

  private formatJobTitle(title: string): string {
    return title.split(" ").map((word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(" ");
  }

  private createJobPostData(companyName: string, jobTitle: string, jobDescription: string, requirements: string, originalUrl: string): JobPostData {
    // Extract requirements from description if no separate section
    if (jobDescription && !requirements) {
      const descLower = jobDescription.toLowerCase();
      const reqStart = Math.max(
        descLower.indexOf("requirements"),
        descLower.indexOf("qualifications"),
        descLower.indexOf("skills"),
        descLower.indexOf("experience")
      );

      if (reqStart !== -1) {
        requirements = jobDescription.substring(reqStart, reqStart + 1000);
      }
    }

    return {
      companyName: companyName.replace(/\s+/g, " ").trim() || "Unknown Company",
      jobTitle: jobTitle.replace(/\s+/g, " ").trim() || "Unknown Position",
      jobDescription: jobDescription.replace(/\s+/g, " ").trim().substring(0, 2000),
      requirements: requirements.replace(/\s+/g, " ").trim().substring(0, 1000),
      originalUrl,
    };
  }
}