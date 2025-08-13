import axios from "axios";
import * as cheerio from "cheerio";
import {JobPostData} from "../types/JobPostData";
import {Logger} from "../utils/Logger";

export class JobScrapingService {
  private readonly USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
  private readonly log = Logger.create('JobScrapingService');

  // Generic selectors that work across many job sites
  private readonly GENERIC_SELECTORS = {
    companyName: [
      '[data-testid*="company"]',
      '[class*="company"]',
      '[id*="company"]',
      'a[href*="/company/"]',
      '.employer-name',
      '.company-name',
      '[data-automation-id*="company"]',
      'span:contains("Company")',
      'div:contains("Company")',
      '[data-ph-at-id*="company"]',
      '.ph-page-element-page15-text',
      '.company-info',
      '.organization-name'
    ],
    jobTitle: [
      'h1',
      '[data-testid*="title"]',
      '[class*="title"]',
      '[class*="job-title"]',
      '[data-automation-id*="title"]',
      '.job-title',
      '.position-title',
      'title',
      '[data-ph-at-id*="job-title"]',
      '.ph-page-element-page15-text1',
      '.job-header h1',
      '.position-name'
    ],
    jobDescription: [
      '[data-testid*="description"]',
      '[class*="description"]',
      '[id*="description"]',
      '[data-automation-id*="description"]',
      '.job-description',
      '.job-content',
      '.description',
      'main',
      '.content',
      'article',
      '[data-ph-at-id*="job-description"]',
      '.ph-page-element-page15-text-block',
      '.job-details',
      '.position-description'
    ]
  };

  async expandTinyUrl(tinyUrlId: string): Promise<string> {
    try {
      const tinyUrl = `https://tinyurl.com/${tinyUrlId}`;

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
      if (error.response?.headers?.location) {
        return error.response.headers.location;
      }

      return `https://tinyurl.com/${tinyUrlId}`;
    }
  }

  async scrapeJobPost(url: string): Promise<JobPostData | null> {
    try {
      this.log.info('scrapeJobPost', 'Starting job post scraping', {url});
      
      const response = await axios.get(url, {
        headers: {"User-Agent": this.USER_AGENT},
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      let result: JobPostData | null = null;
      
      // Try site-specific scrapers first
      if (url.includes("linkedin.com")) {
        result = this.scrapeLinkedIn($);
      } else if (url.includes("indeed.com")) {
        result = this.scrapeIndeed($);
      } else if (url.includes("myworkdayjobs.com")) {
        result = this.scrapeWorkday($, url);
      } else if (url.includes("careers.humana.com")) {
        result = this.scrapeHumana($, url);
      }

      // If site-specific scraper didn't work or returned incomplete data, try generic
      if (!result || this.isIncompleteData(result)) {
        this.log.info('scrapeJobPost', 'Trying generic scraper as fallback');
        const genericResult = this.scrapeGeneric($, url);
        if (genericResult && this.isMoreComplete(genericResult, result)) {
          result = genericResult;
        }
      }

      this.log.info('scrapeJobPost', 'Job post scraping completed', {
        url,
        hasResult: !!result,
        companyName: result?.companyName,
        jobTitle: result?.jobTitle
      });

      return result;
    } catch (error) {
      this.log.error('scrapeJobPost', 'Error scraping job post', {url, error});
      return null;
    }
  }

  private isIncompleteData(data: JobPostData | null): boolean {
    if (!data) return true;
    return !data.companyName || data.companyName === "Unknown Company" ||
           !data.jobTitle || data.jobTitle === "Unknown Position" ||
           !data.jobDescription || data.jobDescription.length < 50;
  }

  private isMoreComplete(newData: JobPostData | null, oldData: JobPostData | null): boolean {
    if (!newData) return false;
    if (!oldData) return true;
    
    const newScore = this.getDataCompleteness(newData);
    const oldScore = this.getDataCompleteness(oldData);
    
    return newScore > oldScore;
  }

  private getDataCompleteness(data: JobPostData): number {
    let score = 0;
    if (data.companyName && data.companyName !== "Unknown Company") score += 3;
    if (data.jobTitle && data.jobTitle !== "Unknown Position") score += 3;
    if (data.jobDescription && data.jobDescription.length > 100) score += 2;
    if (data.requirements && data.requirements.length > 50) score += 1;
    return score;
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

  private scrapeHumana($: cheerio.CheerioAPI, url: string): JobPostData {
    const companyName = "Humana Inc.";
    
    // Extract job title from URL path or page elements
    const urlParts = url.split('/');
    const jobTitlePart = urlParts.find(part => 
      part.includes('-') && 
      part.length > 10 && 
      !part.includes('HUMHUM') && 
      !part.includes('us') && 
      !part.includes('en')
    );
    
    let jobTitle = $("h1").first().text().trim() ||
                   $("[data-ph-at-id*='job-title']").text().trim() ||
                   $(".job-title").text().trim() ||
                   $("title").text().split(" - ")[0]?.trim();
                   
    if (!jobTitle && jobTitlePart) {
      jobTitle = this.formatJobTitle(jobTitlePart.replace(/-/g, ' ').replace(/\?.*$/, ''));
    }
    
    const jobDescription = $("[data-ph-at-id*='job-description']").text().trim() ||
                          $(".job-description").text().trim() ||
                          $(".ph-page-element-page15-text-block").text().trim() ||
                          $("main").text().trim() ||
                          $(".content").text().trim();

    return this.createJobPostData(companyName, jobTitle, jobDescription, "", url);
  }

  private scrapeGeneric($: cheerio.CheerioAPI, url?: string): JobPostData | null {
    const companyName = this.extractWithMultipleSelectors($, this.GENERIC_SELECTORS.companyName) || 
                       this.extractCompanyFromUrl(url) ||
                       this.findCompanyName($);
    
    const jobTitle = this.extractWithMultipleSelectors($, this.GENERIC_SELECTORS.jobTitle) ||
                    this.extractJobTitleFromUrl(url) ||
                    this.extractFromPageTitle($);
    
    const jobDescription = this.extractWithMultipleSelectors($, this.GENERIC_SELECTORS.jobDescription) ||
                          $("body").text().trim();

    if (!companyName && !jobTitle && !jobDescription) {
      return null;
    }

    return this.createJobPostData(companyName, jobTitle, jobDescription, "", url || "");
  }

  private extractWithMultipleSelectors($: cheerio.CheerioAPI, selectors: string[]): string {
    for (const selector of selectors) {
      try {
        let element;
        
        // Handle special selectors like :contains()
        if (selector.includes(':contains(')) {
          const baseSelector = selector.split(':contains(')[0];
          const containsText = selector.match(/:contains\("(.+?)"\)/)?.[1];
          if (containsText) {
            element = $(baseSelector).filter((_, el) => 
              $(el).text().toLowerCase().includes(containsText.toLowerCase())
            ).first();
          }
        } else {
          element = $(selector).first();
        }
        
        if (element && element.length > 0) {
          const text = element.text().trim();
          if (text && text.length > 0 && text.length < 300) {
            return this.cleanText(text);
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    return "";
  }

  private extractCompanyFromUrl(url?: string): string {
    if (!url) return "";
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Extract company from common job site patterns
      if (hostname.includes('.myworkdayjobs.com')) {
        const match = hostname.match(/^([^.]+)\.myworkdayjobs\.com/);
        if (match) {
          return this.formatCompanyName(match[1]);
        }
      }
      
      if (hostname.includes('careers.')) {
        const match = hostname.match(/careers\.([^.]+)\.com/);
        if (match) {
          return this.formatCompanyName(match[1]);
        }
      }
      
      if (hostname.includes('jobs.') || hostname.includes('careers.')) {
        const parts = hostname.split('.');
        const companyPart = parts.find(part => 
          part !== 'jobs' && part !== 'careers' && part !== 'www' && 
          part !== 'com' && part !== 'org' && part.length > 2
        );
        if (companyPart) {
          return this.formatCompanyName(companyPart);
        }
      }
      
      // Try to extract from main domain
      const mainDomain = hostname.replace(/^(www\.|jobs\.|careers\.)/, '').split('.')[0];
      if (mainDomain && mainDomain.length > 2) {
        return this.formatCompanyName(mainDomain);
      }
    } catch (error) {
      // Continue with other methods
    }
    
    return "";
  }

  private extractJobTitleFromUrl(url?: string): string {
    if (!url) return "";
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      // Look for job title patterns in URL path
      const jobTitlePart = pathParts.find(part => 
        part.includes('-') && 
        part.length > 10 && 
        !part.includes('job') &&
        !part.includes('apply') &&
        !part.includes('id') &&
        !part.includes('us') &&
        !part.includes('en') &&
        !part.match(/^[A-Z]+[A-Z0-9]*$/) // Skip all caps job IDs
      );
      
      if (jobTitlePart) {
        return this.formatJobTitle(
          jobTitlePart
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\?.*$/, '')
        );
      }
    } catch (error) {
      // Continue with other methods
    }
    
    return "";
  }

  private extractFromPageTitle($: cheerio.CheerioAPI): string {
    const title = $("title").text().trim();
    if (title) {
      // Common patterns: "Job Title - Company Name" or "Job Title | Company Name"
      const parts = title.split(/\s*[-|]\s*/);
      if (parts.length >= 2) {
        return this.cleanText(parts[0]);
      }
      return this.cleanText(title);
    }
    return "";
  }

  private formatCompanyName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.-]/g, ' ')
      .trim();
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
        descLower.indexOf("experience"),
        descLower.indexOf("must have"),
        descLower.indexOf("preferred")
      );

      if (reqStart !== -1) {
        const reqEnd = Math.min(
          descLower.indexOf("responsibilities", reqStart),
          descLower.indexOf("duties", reqStart),
          descLower.indexOf("benefits", reqStart),
          reqStart + 1500
        );
        const endIndex = reqEnd > reqStart ? reqEnd : reqStart + 1000;
        requirements = jobDescription.substring(reqStart, endIndex);
      }
    }

    // Clean company name and remove trailing periods
    const cleanedCompanyName = this.cleanText(companyName).replace(/\.$/, '') || "Unknown Company";

    return {
      companyName: cleanedCompanyName,
      jobTitle: this.cleanText(jobTitle) || "Unknown Position", 
      jobDescription: this.cleanText(jobDescription).substring(0, 2000) || "No description available",
      requirements: this.cleanText(requirements).substring(0, 1000),
      originalUrl,
    };
  }
}