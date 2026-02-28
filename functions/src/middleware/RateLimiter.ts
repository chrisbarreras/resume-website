import {Logger} from "../utils/Logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {initializeApp, getApps} from "firebase-admin/app";

export class RateLimiter {
  private readonly db: FirebaseFirestore.Firestore;
  private readonly log = Logger.create('RateLimiter');
  
  constructor(
    private maxRequestsPerHour: number = 60,
    private windowMs: number = 60 * 60 * 1000, // 1 hour
    private maxGlobalRequestsPerDay: number = 1000,
    private dailyWindowMs: number = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    // Initialize Firebase Admin if not already initialized
    if (!getApps().length) {
      initializeApp();
    }
    this.db = getFirestore();
  }

  async checkRateLimit(clientIP: string): Promise<boolean> {
    try {
      const now = Date.now();
      
      // Check and update global daily limit
      const globalDoc = this.db.collection('rateLimits').doc('global');
      const globalData = await globalDoc.get();
      
      let globalRequests = 0;
      let globalResetTime = 0;
      
      if (!globalData.exists || now > (globalData.data()?.resetTime || 0)) {
        // Reset global counter
        globalRequests = 1;
        globalResetTime = now + this.dailyWindowMs;
        await globalDoc.set({
          requests: globalRequests,
          resetTime: globalResetTime
        });
        this.log.debug('checkRateLimit', 'Global daily limit reset');
      } else {
        const data = globalData.data()!;
        globalRequests = data.requests;
        globalResetTime = data.resetTime;
        
        if (globalRequests >= this.maxGlobalRequestsPerDay) {
          this.log.warn('checkRateLimit', 'Global daily limit exceeded', {
            globalRequests,
            maxGlobalRequests: this.maxGlobalRequestsPerDay
          });
          return false;
        }
        
        // Increment global counter
        await globalDoc.update({
          requests: FieldValue.increment(1)
        });
        globalRequests++;
      }
      
      // Check client-specific limit
      const clientDoc = this.db.collection('rateLimits').doc(`client_${clientIP}`);
      const clientData = await clientDoc.get();
      
      if (!clientData.exists || now > (clientData.data()?.resetTime || 0)) {
        await clientDoc.set({
          requests: 1,
          resetTime: now + this.windowMs
        });
        this.log.debug('checkRateLimit', 'New rate limit window started', {clientIP});
        return true;
      }
      
      const data = clientData.data()!;
      if (data.requests >= this.maxRequestsPerHour) {
        this.log.warn('checkRateLimit', 'Rate limit exceeded', {
          clientIP, 
          requests: data.requests,
          maxRequests: this.maxRequestsPerHour
        });
        return false;
      }
      
      await clientDoc.update({
        requests: FieldValue.increment(1)
      });
      
      this.log.debug('checkRateLimit', 'Request allowed', {
        clientIP, 
        requests: data.requests + 1,
        maxRequests: this.maxRequestsPerHour,
        globalRequests
      });
      return true;
      
    } catch (error) {
      this.log.error('checkRateLimit', 'Firestore error', {error, clientIP});
      // Fail open - allow request if database is unavailable
      return true;
    }
  }

  async getRemainingRequests(clientIP: string): Promise<number> {
    try {
      const now = Date.now();
      
      // Check global limit
      const globalDoc = this.db.collection('rateLimits').doc('global');
      const globalData = await globalDoc.get();
      
      let globalRemaining = this.maxGlobalRequestsPerDay;
      if (globalData.exists && now <= (globalData.data()?.resetTime || 0)) {
        globalRemaining = Math.max(0, this.maxGlobalRequestsPerDay - (globalData.data()?.requests || 0));
      }
      
      // Check client limit
      const clientDoc = this.db.collection('rateLimits').doc(`client_${clientIP}`);
      const clientData = await clientDoc.get();
      
      if (!clientData.exists || now > (clientData.data()?.resetTime || 0)) {
        return Math.min(this.maxRequestsPerHour, globalRemaining);
      }
      
      const clientRemaining = Math.max(0, this.maxRequestsPerHour - (clientData.data()?.requests || 0));
      return Math.min(clientRemaining, globalRemaining);
      
    } catch (error) {
      this.log.error('getRemainingRequests', 'Firestore error', {error, clientIP});
      // Return max if database is unavailable
      return this.maxRequestsPerHour;
    }
  }
}
