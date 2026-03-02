// Mock firebase-functions/logger since Logger.ts imports it at module load
jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { RequestValidator } from '../validation/RequestValidator';

describe('RequestValidator', () => {
  let validator: RequestValidator;

  beforeEach(() => {
    validator = new RequestValidator();
  });

  // ---------------------------------------------------------------------------
  // validateRequest
  // ---------------------------------------------------------------------------
  describe('validateRequest', () => {
    it('should return invalid for null body', () => {
      const result = validator.validateRequest(null);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Request body is required');
    });

    it('should return invalid for undefined body', () => {
      const result = validator.validateRequest(undefined);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Request body is required');
    });

    it('should return valid for an empty body object (all fields optional)', () => {
      const result = validator.validateRequest({});
      expect(result.isValid).toBe(true);
    });

    it('should return valid for a message exactly at the 500-char limit', () => {
      const result = validator.validateRequest({ message: 'x'.repeat(500) });
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for a message exceeding the 500-char limit', () => {
      const result = validator.validateRequest({ message: 'x'.repeat(501) });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Message too long');
    });

    it('should return valid for a standard alphanumeric jobPostId', () => {
      const result = validator.validateRequest({ jobPostId: 'jobABC123' });
      expect(result.isValid).toBe(true);
    });

    it('should return valid for a jobPostId containing hyphens and underscores', () => {
      const result = validator.validateRequest({ jobPostId: 'valid-id_123' });
      expect(result.isValid).toBe(true);
    });

    it('should return valid for a jobPostId at exactly 20 characters', () => {
      const result = validator.validateRequest({ jobPostId: 'a'.repeat(20) });
      expect(result.isValid).toBe(true);
    });

    it('should return invalid for a jobPostId exceeding 20 characters', () => {
      const result = validator.validateRequest({ jobPostId: 'a'.repeat(21) });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid job post ID format');
    });

    it('should return invalid for a jobPostId containing spaces', () => {
      const result = validator.validateRequest({ jobPostId: 'invalid id' });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid job post ID format');
    });

    it('should return invalid for a jobPostId containing special characters', () => {
      const result = validator.validateRequest({ jobPostId: 'invalid!' });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid job post ID format');
    });

    it('should return valid when both message and jobPostId are within limits', () => {
      const result = validator.validateRequest({ message: 'hello', jobPostId: 'abc123' });
      expect(result.isValid).toBe(true);
    });

    it('should allow a message-only body with no jobPostId', () => {
      const result = validator.validateRequest({ message: 'just a message' });
      expect(result.isValid).toBe(true);
    });

    it('should allow a jobPostId-only body with no message', () => {
      const result = validator.validateRequest({ jobPostId: 'postId' });
      expect(result.isValid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeMessage
  // ---------------------------------------------------------------------------
  describe('sanitizeMessage', () => {
    it('should return empty string unchanged', () => {
      expect(validator.sanitizeMessage('')).toBe('');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(validator.sanitizeMessage('  hello  ')).toBe('hello');
    });

    it('should truncate a message longer than 500 characters', () => {
      const result = validator.sanitizeMessage('x'.repeat(600));
      expect(result.length).toBe(500);
    });

    it('should not modify a message within the limit', () => {
      const msg = 'short message';
      expect(validator.sanitizeMessage(msg)).toBe('short message');
    });
  });

  // ---------------------------------------------------------------------------
  // Custom configuration
  // ---------------------------------------------------------------------------
  describe('custom configuration', () => {
    it('should respect a custom maxMessageLength', () => {
      const custom = new RequestValidator(100);
      expect(custom.validateRequest({ message: 'x'.repeat(101) }).isValid).toBe(false);
      expect(custom.validateRequest({ message: 'x'.repeat(100) }).isValid).toBe(true);
    });
  });
});
