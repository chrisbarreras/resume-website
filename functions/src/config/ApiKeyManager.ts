import * as functions from "firebase-functions";
import {Logger} from "../utils/Logger";

export class ApiKeyManager {
  private readonly log = Logger.create('ApiKeyManager');
  private cachedApiKey: string | null = null;

  getApiKey(): string {
    if (this.cachedApiKey) {
      return this.cachedApiKey;
    }

    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      try {
        const config = functions.config();
        apiKey = config.gemini?.api_key;
        this.log.info('getApiKey', 'Using Firebase config for API key');
      } catch (configError) {
        this.log.warn('getApiKey', 'Firebase config not available', {configError});
      }
    } else {
      this.log.info('getApiKey', 'Using environment variable for API key');
    }

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment or config");
    }

    this.cachedApiKey = apiKey;
    return apiKey;
  }

  clearCache(): void {
    this.cachedApiKey = null;
  }
}
