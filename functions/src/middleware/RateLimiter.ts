import {Logger} from "../utils/Logger";

export class RateLimiter {
  private cache = new Map<string, {requests: number, resetTime: number}>();
  private readonly log = Logger.create('RateLimiter');
  
  constructor(
    private maxRequestsPerHour: number = 50,
    private windowMs: number = 60 * 60 * 1000 // 1 hour
  ) {}

  checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const clientData = this.cache.get(clientIP);
    
    if (!clientData || now > clientData.resetTime) {
      this.cache.set(clientIP, {requests: 1, resetTime: now + this.windowMs});
      this.log.info('checkRateLimit', 'New rate limit window started', {clientIP});
      return true;
    }
    
    if (clientData.requests >= this.maxRequestsPerHour) {
      this.log.warn('checkRateLimit', 'Rate limit exceeded', {
        clientIP, 
        requests: clientData.requests,
        maxRequests: this.maxRequestsPerHour
      });
      return false;
    }
    
    clientData.requests++;
    this.log.info('checkRateLimit', 'Request allowed', {
      clientIP, 
      requests: clientData.requests,
      maxRequests: this.maxRequestsPerHour
    });
    return true;
  }

  getRemainingRequests(clientIP: string): number {
    const clientData = this.cache.get(clientIP);
    if (!clientData || Date.now() > clientData.resetTime) {
      return this.maxRequestsPerHour;
    }
    return Math.max(0, this.maxRequestsPerHour - clientData.requests);
  }
}
