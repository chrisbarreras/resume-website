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
          jobPostData = await this.jobScrapingService.scrapeJobPost(originalUrl);
        }
      } catch (error) {
        this.log.warn('handleRequest', 'Failed to process job post', {jobPostId, error});
      }
    }

    // Generate AI response
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
}
