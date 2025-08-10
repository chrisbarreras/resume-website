import {GoogleGenerativeAI} from "@google/generative-ai";

export class EmbeddingService {
  private cache = new Map<string, { embedding: number[], timestamp: number }>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  constructor(private genAI: GoogleGenerativeAI) {}

  async getEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({model: "text-embedding-004"});
    const {embedding} = await model.embedContent(text);
    return embedding.values as number[];
  }

  async getCachedEmbedding(text: string): Promise<number[]> {
    const now = Date.now();
    const cached = this.cache.get(text);

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.embedding;
    }

    const embeddingValues = await this.getEmbedding(text);
    this.cache.set(text, {embedding: embeddingValues, timestamp: now});

    this.cleanOldCacheEntries(now);
    return embeddingValues;
  }

  private cleanOldCacheEntries(now: number): void {
    if (this.cache.size > 100) {
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.CACHE_DURATION) {
          this.cache.delete(key);
        }
      }
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    const na = Math.hypot(...a);
    const nb = Math.hypot(...b);
    return dot / (na * nb);
  }
}