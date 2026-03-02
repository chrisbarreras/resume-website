jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn().mockReturnValue([{}]), // Simulate already-initialized app
  initializeApp: jest.fn(),
}));

// Create the Firestore mock inside the factory so the functions are stable
// references that can be configured per-test via jest.requireMock().
jest.mock('firebase-admin/firestore', () => {
  const mockGlobalGet = jest.fn();
  const mockClientGet = jest.fn();
  const mockSet = jest.fn().mockResolvedValue(undefined);
  const mockUpdate = jest.fn().mockResolvedValue(undefined);

  const mockDoc = jest.fn((docId: string) => ({
    get: docId === 'global' ? mockGlobalGet : mockClientGet,
    set: mockSet,
    update: mockUpdate,
  }));

  return {
    getFirestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({ doc: mockDoc }),
    }),
    FieldValue: { increment: jest.fn((n: number) => n) },
    // Expose mocks for access in tests
    _mocks: { mockGlobalGet, mockClientGet, mockSet, mockUpdate, mockDoc },
  };
});

import { RateLimiter } from '../middleware/RateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockGlobalGet: jest.Mock;
  let mockClientGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;

  const CLIENT_IP = '192.168.1.1';
  const FUTURE = Date.now() + 60 * 60 * 1000; // 1 hour from now
  const PAST = Date.now() - 1000;             // 1 second ago

  beforeEach(() => {
    jest.clearAllMocks();

    const m = (jest.requireMock('firebase-admin/firestore') as any)._mocks;
    mockGlobalGet = m.mockGlobalGet;
    mockClientGet = m.mockClientGet;
    mockSet = m.mockSet;
    mockUpdate = m.mockUpdate;

    // Default: global doc is within its window with 100 out of 1000 requests used
    mockGlobalGet.mockResolvedValue({
      exists: true,
      data: () => ({ requests: 100, resetTime: FUTURE }),
    });

    // Default: client has no existing document (fresh window)
    mockClientGet.mockResolvedValue({ exists: false, data: () => null });

    rateLimiter = new RateLimiter();
  });

  // ---------------------------------------------------------------------------
  // checkRateLimit
  // ---------------------------------------------------------------------------
  describe('checkRateLimit', () => {
    it('should allow the first request from a new client (no doc exists)', async () => {
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(true);
    });

    it('should allow a request when the client is within its hourly limit', async () => {
      mockClientGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 30, resetTime: FUTURE }),
      });
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(true);
    });

    it('should deny a request when the per-client hourly limit (60) is reached', async () => {
      mockClientGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 60, resetTime: FUTURE }), // default max is 60
      });
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(false);
    });

    it('should reset the client window and allow the request when the window has expired', async () => {
      mockClientGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 60, resetTime: PAST }), // expired
      });
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalled(); // doc should have been reset
    });

    it('should deny a request when the global daily limit (1000) is reached', async () => {
      mockGlobalGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 1000, resetTime: FUTURE }),
      });
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(false);
    });

    it('should reset the global window and allow the request when it has expired', async () => {
      mockGlobalGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 1000, resetTime: PAST }), // expired
      });
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalled();
    });

    it('should fail open (return true) when Firestore throws an error', async () => {
      mockGlobalGet.mockRejectedValue(new Error('Firestore unavailable'));
      const result = await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(result).toBe(true);
    });

    it('should increment the client request counter for an allowed request', async () => {
      mockClientGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 5, resetTime: FUTURE }),
      });
      await rateLimiter.checkRateLimit(CLIENT_IP);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getRemainingRequests
  // ---------------------------------------------------------------------------
  describe('getRemainingRequests', () => {
    it('should return maxRequestsPerHour (60) for a fresh client with no doc', async () => {
      const remaining = await rateLimiter.getRemainingRequests(CLIENT_IP);
      expect(remaining).toBe(60);
    });

    it('should return the correct remaining count within an active window', async () => {
      mockClientGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 30, resetTime: FUTURE }),
      });
      const remaining = await rateLimiter.getRemainingRequests(CLIENT_IP);
      expect(remaining).toBe(30); // 60 - 30
    });

    it('should return 0 when the per-client limit is fully exhausted', async () => {
      mockClientGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 60, resetTime: FUTURE }),
      });
      const remaining = await rateLimiter.getRemainingRequests(CLIENT_IP);
      expect(remaining).toBe(0);
    });

    it('should be capped by the global remaining count when global is the bottleneck', async () => {
      mockGlobalGet.mockResolvedValue({
        exists: true,
        data: () => ({ requests: 999, resetTime: FUTURE }), // only 1 remaining globally
      });
      const remaining = await rateLimiter.getRemainingRequests(CLIENT_IP);
      expect(remaining).toBe(1); // min(60, 1)
    });

    it('should return maxRequestsPerHour when Firestore throws', async () => {
      mockGlobalGet.mockRejectedValue(new Error('Firestore unavailable'));
      const remaining = await rateLimiter.getRemainingRequests(CLIENT_IP);
      expect(remaining).toBe(60);
    });
  });
});
