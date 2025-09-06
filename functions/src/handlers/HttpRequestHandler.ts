import {Request} from "firebase-functions/v2/https";
import {Response} from "express-serve-static-core";
import {GoogleGenerativeAI} from "@google/generative-ai";
import {FitAnswerController} from "../controllers/FitAnswerController";
import {RateLimiter} from "../middleware/RateLimiter";
import {RequestValidator} from "../validation/RequestValidator";
import {ApiKeyManager} from "../config/ApiKeyManager";
import {LoggingProxy} from "../utils/LoggingProxy";
import {Logger} from "../utils/Logger";

export class HttpRequestHandler {
  private readonly log = Logger.create('HttpRequestHandler');
  private rateLimiter: RateLimiter;
  private validator: RequestValidator;
  private apiKeyManager: ApiKeyManager;

  constructor() {
    this.rateLimiter = LoggingProxy.create(new RateLimiter(), 'RateLimiter');
    this.validator = LoggingProxy.create(new RequestValidator(), 'RequestValidator');
    this.apiKeyManager = new ApiKeyManager();
  }

  async handleRequest(request: Request, response: Response): Promise<void> {
    const clientIP = this.extractClientIP(request);
    
    this.log.info('handleRequest', 'Received request', {
      origin: request.headers.origin,
      method: request.method,
      requestBody: request.body,
      clientIP
    });

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      this.setCorsHeaders(response);
      response.status(200).end();
      return;
    }

    try {
      // Rate limiting
      if (!(await this.rateLimiter.checkRateLimit(clientIP))) { // Add await here
        this.setCorsHeaders(response);
        response.status(429).json({error: "Too many requests. Try again later."});
        return;
      }

      // Request validation
      const validation = await this.validator.validateRequest(request.body); // Add await here
      if (!validation.isValid) {
        this.log.warn('handleRequest', 'Invalid request', {validation, clientIP});
        this.setCorsHeaders(response);
        response.status(400).json({error: validation.message});
        return;
      }

      // Process request
      const result = await this.processRequest(request);
      this.setCorsHeaders(response);
      response.json(result);

    } catch (error) {
      this.handleError(error, response, clientIP);
    }
  }

  private async processRequest(request: Request) {
    const apiKey = this.apiKeyManager.getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const controller = LoggingProxy.create(new FitAnswerController(genAI), 'FitAnswerController');

    const userMessage = request.body?.message;
    const jobPostId = request.body?.jobPostId;

    return await controller.handleRequest(userMessage, jobPostId);
  }

  private extractClientIP(request: Request): string {
    return request.ip || 
           (request.headers['x-forwarded-for'] as string) || 
           'unknown';
  }

  private handleError(error: any, response: Response, clientIP: string): void {
    this.log.error('handleRequest', 'Error processing request', {error, clientIP});
    
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    this.setCorsHeaders(response);
    response.status(500).json({
      error: "Could not get a response from Gemini: " + errorMessage,
    });
  }

  private setCorsHeaders(response: Response): void {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}
