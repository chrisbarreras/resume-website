jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Make LoggingProxy transparent so mock instances are used directly
jest.mock('../utils/LoggingProxy', () => ({
  LoggingProxy: { create: (instance: any) => instance },
}));

jest.mock('../middleware/RateLimiter');
jest.mock('../validation/RequestValidator');
jest.mock('../config/ApiKeyManager');
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({})),
}));

// Expose a stable reference to the controller's handleRequest mock via a
// module-level property so tests can configure it per-scenario.
jest.mock('../controllers/FitAnswerController', () => {
  const mockHandleRequest = jest.fn().mockResolvedValue({
    answer: '<p>AI response</p>',
    companyName: 'Acme',
  });
  return {
    FitAnswerController: jest.fn().mockImplementation(() => ({
      handleRequest: mockHandleRequest,
    })),
    __mockHandleRequest: mockHandleRequest,
  };
});

import { HttpRequestHandler } from '../handlers/HttpRequestHandler';
import { RateLimiter } from '../middleware/RateLimiter';
import { RequestValidator } from '../validation/RequestValidator';
import { ApiKeyManager } from '../config/ApiKeyManager';

const MockRateLimiter = RateLimiter as jest.MockedClass<typeof RateLimiter>;
const MockRequestValidator = RequestValidator as jest.MockedClass<typeof RequestValidator>;
const MockApiKeyManager = ApiKeyManager as jest.MockedClass<typeof ApiKeyManager>;

describe('HttpRequestHandler', () => {
  let handler: HttpRequestHandler;
  let mockCheckRateLimit: jest.Mock;
  let mockValidateRequest: jest.Mock;
  let mockGetApiKey: jest.Mock;
  let mockHandleRequest: jest.Mock;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCheckRateLimit = jest.fn().mockResolvedValue(true);
    mockValidateRequest = jest.fn().mockReturnValue({ isValid: true });
    mockGetApiKey = jest.fn().mockReturnValue('test-api-key');
    mockHandleRequest = (jest.requireMock('../controllers/FitAnswerController') as any).__mockHandleRequest;
    mockHandleRequest.mockResolvedValue({ answer: '<p>AI response</p>', companyName: 'Acme' });

    MockRateLimiter.mockImplementation(() => ({ checkRateLimit: mockCheckRateLimit } as any));
    MockRequestValidator.mockImplementation(() => ({ validateRequest: mockValidateRequest } as any));
    MockApiKeyManager.mockImplementation(() => ({ getApiKey: mockGetApiKey } as any));

    handler = new HttpRequestHandler();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'POST',
      headers: { origin: 'http://localhost' },
      ip: '127.0.0.1',
      body: { message: 'hello', jobPostId: 'job1' },
    };
  });

  // ---------------------------------------------------------------------------
  // OPTIONS preflight
  // ---------------------------------------------------------------------------
  describe('OPTIONS preflight', () => {
    beforeEach(() => { mockRequest.method = 'OPTIONS'; });

    it('should respond with 200 for OPTIONS', async () => {
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should call end() for OPTIONS', async () => {
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should set Access-Control-Allow-Origin header for OPTIONS', async () => {
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });

  // ---------------------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------------------
  describe('rate limiting', () => {
    it('should return 429 when the rate limit is exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue(false);
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
    });

    it('should include an error message in the 429 response body', async () => {
      mockCheckRateLimit.mockResolvedValue(false);
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Too many requests'),
      });
    });

    it('should set CORS headers even on a 429 response', async () => {
      mockCheckRateLimit.mockResolvedValue(false);
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });

  // ---------------------------------------------------------------------------
  // Request validation
  // ---------------------------------------------------------------------------
  describe('request validation', () => {
    it('should return 400 when validation fails', async () => {
      mockValidateRequest.mockReturnValue({ isValid: false, message: 'Message too long' });
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should include the validation message in the 400 response body', async () => {
      mockValidateRequest.mockReturnValue({ isValid: false, message: 'Message too long' });
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Message too long' });
    });
  });

  // ---------------------------------------------------------------------------
  // Successful processing
  // ---------------------------------------------------------------------------
  describe('successful processing', () => {
    it('should respond with json containing the controller result', async () => {
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({
        answer: '<p>AI response</p>',
        companyName: 'Acme',
      });
    });

    it('should set CORS headers on a successful response', async () => {
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });

    it('should not call status() with an error code on a valid request', async () => {
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.status).not.toHaveBeenCalledWith(400);
      expect(mockResponse.status).not.toHaveBeenCalledWith(429);
      expect(mockResponse.status).not.toHaveBeenCalledWith(500);
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  describe('error handling', () => {
    it('should return 500 when the controller throws', async () => {
      mockHandleRequest.mockRejectedValue(new Error('AI service down'));
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should include the error message in the 500 response body', async () => {
      mockHandleRequest.mockRejectedValue(new Error('AI service down'));
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('AI service down'),
      });
    });

    it('should set CORS headers even on a 500 error', async () => {
      mockHandleRequest.mockRejectedValue(new Error('Error'));
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockResponse.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });

  // ---------------------------------------------------------------------------
  // IP extraction
  // ---------------------------------------------------------------------------
  describe('IP extraction', () => {
    it('should use x-forwarded-for when request.ip is absent', async () => {
      mockRequest.ip = undefined;
      mockRequest.headers['x-forwarded-for'] = '10.0.0.1';
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockCheckRateLimit).toHaveBeenCalledWith('10.0.0.1');
    });

    it('should use request.ip when present', async () => {
      mockRequest.ip = '192.168.1.1';
      await handler.handleRequest(mockRequest, mockResponse);
      expect(mockCheckRateLimit).toHaveBeenCalledWith('192.168.1.1');
    });
  });
});
