import {GoogleGenerativeAI} from "@google/generative-ai";
import {EmbeddingService} from "./EmbeddingService";
import {Logger} from "../utils/Logger";
// import {CHRIS_PROFILE} from "../constants/ChrisProfile";

export class ContentFilterService {
  // private profileEmbedding: number[] | null = null;
  // private readonly SIMILARITY_THRESHOLD = 0.58;
  private log = Logger.create('ContentFilterService');

  constructor(
    private genAI: GoogleGenerativeAI,
    private embeddingService: EmbeddingService
  ) {
    this.log.info("constructor", "hack", this.genAI == undefined);
    this.log.info("constructor", "embeddingService", this.embeddingService == undefined);
  }

  async isAboutChris(question: string): Promise<boolean> {
    return true;
    
    // if (!question || question.trim().length === 0) {
    //   return true; // default pitch flow
    // }

    // try {
    //   await this.ensureProfileEmbedding();
    //   const questionEmbedding = await this.embeddingService.getCachedEmbedding(question);
    //   const similarity = this.embeddingService.cosineSimilarity(this.profileEmbedding!, questionEmbedding);

    //   return similarity >= this.SIMILARITY_THRESHOLD;
    // } catch (error) {
    //   logger.warn("Embedding comparison failed, defaulting to allow", {error});
    //   return true;
    // }
  }

  // private async ensureProfileEmbedding(): Promise<void> {
  //   if (!this.profileEmbedding) {
  //     this.profileEmbedding = await this.embeddingService.getCachedEmbedding(CHRIS_PROFILE);
  //   }
  // }
}