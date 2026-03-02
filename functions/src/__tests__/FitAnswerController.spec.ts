// Order matters: mocks must be registered before any imports
jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Make LoggingProxy a transparent pass-through so we can spy on real instances
jest.mock('../utils/LoggingProxy', () => ({
  LoggingProxy: { create: (instance: any) => instance },
}));

// Auto-mock both services so their constructors don't touch real infrastructure
jest.mock('../services/JobReadingService');
jest.mock('../services/AIResponseService');

import { FitAnswerController } from '../controllers/FitAnswerController';
import { JobScrapingService } from '../services/JobReadingService';
import { AIResponseService } from '../services/AIResponseService';

const MockJobScrapingService = JobScrapingService as jest.MockedClass<typeof JobScrapingService>;
const MockAIResponseService = AIResponseService as jest.MockedClass<typeof AIResponseService>;

// Minimal valid job data used across multiple tests
const VALID_JOB_DATA = {
  companyName: 'Acme Corp',
  jobTitle: 'Software Engineer',
  jobDescription: 'A sufficiently detailed job description that exceeds twenty characters.',
};

describe('FitAnswerController', () => {
  let controller: FitAnswerController;
  let mockReadJobPost: jest.Mock;
  let mockGenerateResponse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReadJobPost = jest.fn();
    mockGenerateResponse = jest.fn().mockResolvedValue('<p>AI response</p>');

    MockJobScrapingService.mockImplementation(() => ({
      readJobPost: mockReadJobPost,
      listJobPostFiles: jest.fn(),
    } as any));

    MockAIResponseService.mockImplementation(() => ({
      generateResponse: mockGenerateResponse,
    } as any));

    // null is safe here because AIResponseService is mocked and ignores genAI
    controller = new FitAnswerController(null as any);
  });

  // ---------------------------------------------------------------------------
  // handleRequest — basic delegation
  // ---------------------------------------------------------------------------
  describe('handleRequest', () => {
    it('should call generateResponse with null jobPostData when no jobPostName is given', async () => {
      await controller.handleRequest('Tell me about Chris');
      expect(mockGenerateResponse).toHaveBeenCalledWith('Tell me about Chris', null);
    });

    it('should return the answer string from the AI service', async () => {
      const result = await controller.handleRequest('question');
      expect(result.answer).toBe('<p>AI response</p>');
    });

    it('should not include companyName in response when no job post is given', async () => {
      const result = await controller.handleRequest('question');
      expect(result.companyName).toBeUndefined();
    });

    it('should pass valid job data to generateResponse', async () => {
      mockReadJobPost.mockResolvedValue(VALID_JOB_DATA);
      await controller.handleRequest('question', 'jobFile');
      expect(mockGenerateResponse).toHaveBeenCalledWith('question', VALID_JOB_DATA);
    });

    it('should include companyName in response when valid job data is found', async () => {
      mockReadJobPost.mockResolvedValue(VALID_JOB_DATA);
      const result = await controller.handleRequest('question', 'jobFile');
      expect(result.companyName).toBe('Acme Corp');
    });
  });

  // ---------------------------------------------------------------------------
  // handleRequest — job data fallback scenarios
  // ---------------------------------------------------------------------------
  describe('handleRequest — fallback behaviour', () => {
    it('should fall back to null when companyName is "unknown company"', async () => {
      mockReadJobPost.mockResolvedValue({ ...VALID_JOB_DATA, companyName: 'unknown company' });
      await controller.handleRequest('question', 'jobFile');
      expect(mockGenerateResponse).toHaveBeenCalledWith('question', null);
    });

    it('should fall back to null when job description is too short (≤20 chars)', async () => {
      mockReadJobPost.mockResolvedValue({ ...VALID_JOB_DATA, jobDescription: 'Short!' });
      await controller.handleRequest('question', 'jobFile');
      expect(mockGenerateResponse).toHaveBeenCalledWith('question', null);
    });

    it('should fall back gracefully when readJobPost throws an error', async () => {
      mockReadJobPost.mockRejectedValue(new Error('Storage error'));
      const result = await controller.handleRequest('question', 'jobFile');
      expect(mockGenerateResponse).toHaveBeenCalledWith('question', null);
      expect(result.answer).toBe('<p>AI response</p>');
    });

    it('should fall back gracefully when readJobPost returns null', async () => {
      mockReadJobPost.mockResolvedValue(null);
      await controller.handleRequest('question', 'jobFile');
      expect(mockGenerateResponse).toHaveBeenCalledWith('question', null);
    });
  });

  // ---------------------------------------------------------------------------
  // isValidJobData (private — accessed via cast)
  // ---------------------------------------------------------------------------
  describe('isValidJobData', () => {
    const valid = (data: any) => (controller as any).isValidJobData(data);

    it('should return false for null', () => expect(valid(null)).toBe(false));
    it('should return false for undefined', () => expect(valid(undefined)).toBe(false));

    it('should return true for fully valid job data', () => {
      expect(valid(VALID_JOB_DATA)).toBe(true);
    });

    it('should return false when companyName is "unknown company"', () => {
      expect(valid({ ...VALID_JOB_DATA, companyName: 'unknown company' })).toBe(false);
    });

    it('should return false when companyName is "unknown"', () => {
      expect(valid({ ...VALID_JOB_DATA, companyName: 'unknown' })).toBe(false);
    });

    it('should return falsy when companyName is empty', () => {
      expect(valid({ ...VALID_JOB_DATA, companyName: '' })).toBeFalsy();
    });

    it('should return false when jobTitle is "unknown position"', () => {
      expect(valid({ ...VALID_JOB_DATA, jobTitle: 'unknown position' })).toBe(false);
    });

    it('should return false when jobTitle is "unknown"', () => {
      expect(valid({ ...VALID_JOB_DATA, jobTitle: 'unknown' })).toBe(false);
    });

    it('should return false when jobDescription is 20 chars or fewer', () => {
      expect(valid({ ...VALID_JOB_DATA, jobDescription: 'Too short!' })).toBe(false);
    });

    it('should return true when jobDescription is exactly 21 chars', () => {
      expect(valid({ ...VALID_JOB_DATA, jobDescription: 'x'.repeat(21) })).toBe(true);
    });
  });
});
