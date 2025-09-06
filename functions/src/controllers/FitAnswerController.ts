import {GoogleGenerativeAI} from "@google/generative-ai";
import {JobScrapingService} from "../services/JobReadingService";
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

  async handleRequest(userMessage: string, jobPostName?: string): Promise<FitAnswerResponse> {
    this.log.info('handleRequest', 'Processing request', {userMessage, jobPostName});

    // Job post processing
    let jobPostData = null;
    if (jobPostName) {
      try {
        this.log.info('handleRequest', 'Processing job post', {jobPostName});

        const scrapedData = await this.jobScrapingService.readJobPost(jobPostName);

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
      } catch (error) {
        this.log.warn('handleRequest', 'Failed to process job post, falling back to default', {jobPostName, error});
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

    // More lenient validation - only check for basic required fields
    const companyName = jobData.companyName?.toLowerCase()?.trim();
    const jobTitle = jobData.jobTitle?.toLowerCase()?.trim();
    const jobDescription = jobData.jobDescription?.trim();

    // Check if we have company name (not unknown/empty)
    const hasValidCompany = companyName && 
      companyName !== 'unknown company' && 
      companyName !== 'unknown' && 
      companyName.length > 0;

    // Check if we have job title (not unknown/empty)  
    const hasValidTitle = jobTitle && 
      jobTitle !== 'unknown position' && 
      jobTitle !== 'unknown' && 
      jobTitle.length > 0;

    // Check if we have some job description (very minimal requirement)
    const hasValidDescription = jobDescription && jobDescription.length > 20;

    // Accept job data if we have all three basic pieces of information
    return hasValidCompany && hasValidTitle && hasValidDescription;
  }
}
