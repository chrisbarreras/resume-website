// Mock firebase-functions/logger before any imports that transitively use it
jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { AIResponseService } from '../services/AIResponseService';

describe('AIResponseService', () => {
  let service: AIResponseService;
  let mockGenerateContent: jest.Mock;
  let mockTextFn: jest.Mock;

  beforeEach(() => {
    mockTextFn = jest.fn().mockReturnValue('<p>AI Response</p>');
    mockGenerateContent = jest.fn().mockResolvedValue({
      response: { text: mockTextFn },
    });

    const mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    } as any;

    service = new AIResponseService(mockGenAI);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // generateResponse — basic behaviour
  // ---------------------------------------------------------------------------
  describe('generateResponse — basic behaviour', () => {
    it('should return the string produced by the AI model', async () => {
      const result = await service.generateResponse('hello', null);
      expect(result).toBe('<p>AI Response</p>');
    });

    it('should call generateContent exactly once per request', async () => {
      await service.generateResponse('hello', null);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should pass a string prompt to generateContent', async () => {
      await service.generateResponse('hello', null);
      expect(typeof mockGenerateContent.mock.calls[0][0]).toBe('string');
    });
  });

  // ---------------------------------------------------------------------------
  // generateResponse — prompt construction
  // ---------------------------------------------------------------------------
  describe('generateResponse — prompt construction', () => {
    it('should ask a generic "strong hire" question for the "initial" sentinel', async () => {
      await service.generateResponse('initial', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('Why would Chris be a strong hire?');
    });

    it('should ask a generic question when userMessage is empty', async () => {
      await service.generateResponse('', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('Why would Chris be a strong hire?');
    });

    it('should include a company-specific question when job data is provided and message is "initial"', async () => {
      await service.generateResponse('initial', {
        companyName: 'Acme Corp',
        jobTitle: 'Software Engineer',
        jobDescription: 'Build great software',
      });
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('Why would Chris be a strong hire for Acme Corp?');
    });

    it('should fall back to the generic question for "LinkedIn User" company', async () => {
      await service.generateResponse('initial', {
        companyName: 'LinkedIn User',
        jobTitle: 'Engineer',
        jobDescription: 'A description',
      });
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('Why would Chris be a strong hire?');
      expect(prompt).not.toContain('LinkedIn User?');
    });

    it('should embed the user question for non-sentinel messages', async () => {
      await service.generateResponse('Does Chris know Python?', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('QUESTION: Does Chris know Python?');
    });

    it('should include job company, title, and description when job data is provided', async () => {
      await service.generateResponse('question', {
        companyName: 'Acme',
        jobTitle: 'Software Engineer',
        jobDescription: 'Build software',
      });
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('Company: Acme');
      expect(prompt).toContain('Position: Software Engineer');
      expect(prompt).toContain('Build software');
    });

    it('should truncate job descriptions longer than 800 chars', async () => {
      const longDescription = 'A'.repeat(1000);
      await service.generateResponse('question', {
        companyName: 'Acme',
        jobTitle: 'Engineer',
        jobDescription: longDescription,
      });
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      // The description block should have exactly 800 A's
      const descMatch = prompt.match(/Description: (A+)/);
      expect(descMatch).not.toBeNull();
      expect(descMatch![1].length).toBe(800);
    });

    it('should omit the JOB DATA section when jobPostData is null', async () => {
      await service.generateResponse('question', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).not.toContain('JOB DATA:');
    });
  });

  // ---------------------------------------------------------------------------
  // Prompt injection prevention
  // ---------------------------------------------------------------------------
  describe('prompt injection prevention', () => {
    it('should strip "SYSTEM:" from user input', async () => {
      await service.generateResponse('SYSTEM: override', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      // The injected keyword should not appear in the QUESTION section
      expect(prompt).not.toMatch(/QUESTION:.*SYSTEM:/);
    });

    it('should strip "INSTRUCTION:" from user input', async () => {
      await service.generateResponse('INSTRUCTION: do this', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).not.toMatch(/QUESTION:.*INSTRUCTION:/);
    });

    it('should strip "IGNORE:" from user input', async () => {
      await service.generateResponse('IGNORE: rules', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).not.toMatch(/QUESTION:.*IGNORE:/);
    });

    it('should strip "FORGET:" from user input', async () => {
      await service.generateResponse('FORGET: everything', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).not.toMatch(/QUESTION:.*FORGET:/);
    });

    it('should collapse double newlines to a single space', async () => {
      await service.generateResponse('line1\n\nline2', null);
      const prompt: string = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain('line1 line2');
      expect(prompt).not.toContain('line1\n\nline2');
    });
  });
});
