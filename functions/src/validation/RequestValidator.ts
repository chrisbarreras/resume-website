import {Logger} from "../utils/Logger";

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface RequestBody {
  message?: string;
  jobPostId?: string;
}

export class RequestValidator {
  private readonly log = Logger.create('RequestValidator');
  
  constructor(
    private maxMessageLength: number = 500,
    private jobPostIdPattern: RegExp = /^[a-zA-Z0-9-_]{1,20}$/
  ) {}

  validateRequest(body: any): ValidationResult {
    // this.log.debug('validateRequest', 'Validating request body', {hasBody: !!body});
    
    if (!body) {
      return {isValid: false, message: "Request body is required"};
    }
    
    const {message, jobPostId} = body as RequestBody;
    
    // Validate message length
    if (message && message.length > this.maxMessageLength) {
      this.log.warn('validateRequest', 'Message too long', {
        messageLength: message.length,
        maxLength: this.maxMessageLength
      });
      return {isValid: false, message: "Message too long"};
    }
    
    // Validate jobPostId format
    if (jobPostId && !this.jobPostIdPattern.test(jobPostId)) {
      this.log.warn('validateRequest', 'Invalid job post ID format', {jobPostId});
      return {isValid: false, message: "Invalid job post ID format"};
    }
    
    this.log.debug('validateRequest', 'Request validation successful');
    return {isValid: true};
  }

  sanitizeMessage(message: string): string {
    if (!message) return message;
    
    return message
      .trim()
      .substring(0, this.maxMessageLength);
  }
}
