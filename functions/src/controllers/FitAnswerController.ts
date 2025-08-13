import {GoogleGenerativeAI} from "@google/generative-ai";
import {JobScrapingService} from "../services/JobScrapingService";
import {AIResponseService} from "../services/AIResponseService";
import {LoggingProxy} from "../utils/LoggingProxy";
import {Logger} from "../utils/Logger";

export interface FitAnswerResponse {
  answer: string;
  companyName?: string;
}

export class FitAnswerController {
  private jobScrapingService: JobScrapingService;
  private aiResponseService: AIResponseService;
  private readonly log = Logger.create('FitAnswerController');

  constructor(private genAI: GoogleGenerativeAI) {
    this.jobScrapingService = LoggingProxy.create(new JobScrapingService(), 'JobScrapingService');
    this.aiResponseService = LoggingProxy.create(new AIResponseService(this.genAI), 'AIResponseService');
  }

  async handleRequest(userMessage: string, jobPostId?: string): Promise<FitAnswerResponse> {
    this.log.info('handleRequest', 'Processing request', {userMessage, jobPostId});

    // Job post processing
    let jobPostData = null;
    if (jobPostId) {
      try {
        this.log.info('handleRequest', 'Processing job post', {jobPostId});
        const originalUrl = await this.jobScrapingService.expandTinyUrl(jobPostId);

        if (originalUrl && originalUrl !== `https://tinyurl.com/${jobPostId}`) {
          const scrapedData = await this.jobScrapingService.scrapeJobPost(originalUrl);
          
          // Validate that we got meaningful job data
          if (this.isValidJobData(scrapedData)) {
            jobPostData = scrapedData;
            this.log.info('handleRequest', 'Valid job data found', {
              companyName: jobPostData?.companyName,
              jobTitle: jobPostData?.jobTitle
            });
          } else {
            this.log.info('handleRequest', 'Job data incomplete, falling back to default', {
              scrapedData
            });
          }
        }
      } catch (error) {
        this.log.warn('handleRequest', 'Failed to process job post, falling back to default', {jobPostId, error});
      }
    }

    // Generate AI response - jobPostData will be null if scraping failed or data was incomplete
    const answer = await this.aiResponseService.generateResponse(userMessage, jobPostData);
    
    const result: FitAnswerResponse = {answer};
    if (jobPostData?.companyName) {
      result.companyName = jobPostData.companyName;
    }
    
    this.log.info('handleRequest', 'Request completed successfully', {
      hasJobData: !!jobPostData,
      companyName: jobPostData?.companyName
    });
    
    return result;
  }

  private isValidJobData(jobData: any): boolean {
    if (!jobData) {
      return false;
    }

    // Check for placeholder/unknown values that indicate failed scraping
    const invalidCompanyNames = [
      'unknown company',
      '[unknown blank]',
      'unknown',
      ''
    ];

    const invalidJobTitles = [
      'unknown position',
      '[unknown blank]',
      'unknown',
      ''
    ];

    const companyName = jobData.companyName?.toLowerCase()?.trim();
    const jobTitle = jobData.jobTitle?.toLowerCase()?.trim();

    // If company name is invalid/unknown, reject the data
    if (!companyName || invalidCompanyNames.some(invalid => 
      companyName.includes(invalid)
    )) {
      return false;
    }

    // If job title is invalid/unknown, reject the data
    if (!jobTitle || invalidJobTitles.some(invalid => 
      jobTitle.includes(invalid)
    )) {
      return false;
    }

    // If job description is too short or generic, reject the data
    const jobDescription = jobData.jobDescription?.trim();
    if (!jobDescription || jobDescription.length < 50) {
      return false;
    }

    return true;
  }
}
