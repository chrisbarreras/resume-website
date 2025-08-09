import dotenv from "dotenv";
dotenv.config();
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {GoogleGenerativeAI} from "@google/generative-ai";
import * as functions from "firebase-functions";
import {EmbeddingService} from "./services/EmbeddingService";
import {JobScrapingService} from "./services/JobScrapingService";
import {ContentFilterService} from "./services/ContentFilterService";
import {AIResponseService} from "./services/AIResponseService";

export class FitAnswerController {
  private embeddingService: EmbeddingService;
  private jobScrapingService: JobScrapingService;
  private contentFilterService: ContentFilterService;
  private aiResponseService: AIResponseService;

  constructor(private genAI: GoogleGenerativeAI) {
    this.embeddingService = new EmbeddingService(genAI);
    this.jobScrapingService = new JobScrapingService();
    this.contentFilterService = new ContentFilterService(genAI, this.embeddingService);
    this.aiResponseService = new AIResponseService(genAI);
  }

  async handleRequest(userMessage: string, jobPostId?: string): Promise<{answer: string; companyName?: string}> {
    logger.info("Handling request for FitAnswer", {userMessage, jobPostId});
    // Content filtering
    if (userMessage && userMessage !== "initial" && userMessage.trim().length > 0) {
      const startTime = Date.now();
      const allowed = await this.contentFilterService.isAboutChris(userMessage);
      const filterTime = Date.now() - startTime;
      logger.info("Semantic filtering completed", {filterTime, allowed});

      if (!allowed) {
        return {answer: "I'm only able to answer questions about Chris Barreras."};
      }
    }

    // Job post processing
    let jobPostData = null;
    if (jobPostId) {
      try {
        logger.info("Processing job post", {jobPostId});
        const originalUrl = await this.jobScrapingService.expandTinyUrl(jobPostId);
        logger.info("Expanded URL", {originalUrl});

        if (originalUrl && originalUrl !== `https://tinyurl.com/${jobPostId}`) {
          jobPostData = await this.jobScrapingService.scrapeJobPost(originalUrl);
          logger.info("Scraped job data", {jobPostData});
        }
      } catch (error) {
        logger.warn("Failed to process job post", {jobPostId, error});
      }
    }

    // Generate AI response
    const answer = await this.aiResponseService.generateResponse(userMessage, jobPostData);
    
    const result: {answer: string; companyName?: string} = {answer};
    if (jobPostData?.companyName) {
      result.companyName = jobPostData.companyName;
    }
    
    return result;
  }
}

function getApiKey(): string {
  let apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    try {
      const config = functions.config();
      apiKey = config.gemini?.api_key;
      logger.info("Using Firebase config for API key");
    } catch (configError) {
      logger.warn("Firebase config not available", configError);
    }
  } else {
    logger.info("Using environment variable for API key");
  }

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in environment or config");
  }

  return apiKey;
}

export const getFitAnswer = onRequest(
  {
    cors: [
      "https://resume-632d7.web.app",
      "https://resume-632d7.firebaseapp.com",
      "http://barreras.codes",
      "https://barreras.codes",
      "http://localhost:5000"
    ],
  },
  async (request, response) => {
    logger.info("Received request for Gemini answer", {
      structuredData: true,
      origin: request.headers.origin,
      method: request.method,
    });

    try {
      const apiKey = getApiKey();
      const genAI = new GoogleGenerativeAI(apiKey);
      const controller = new FitAnswerController(genAI);

      const userMessage = request.body?.message;
      const jobPostId = request.body?.jobPostId;

      const result = await controller.handleRequest(userMessage, jobPostId);
      response.json(result);

    } catch (error) {
      logger.error("Error processing request", error);
      response.status(500).json({
        error: "Could not get a response from Gemini: " +
        (error instanceof Error ? error.message : JSON.stringify(error)),
      });
    }
  }
);
