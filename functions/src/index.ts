import dotenv from "dotenv";
dotenv.config();
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {GoogleGenerativeAI} from "@google/generative-ai";

// Access the secret key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Gemini API Key not set!");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const getFitAnswer = onRequest(
  {cors: ["https://resume-632d7.web.app", "http://barreras.codes"]},
  async (request, response) => {
    logger.info("Received request for Gemini answer", {structuredData: true});

    try {
      const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});

      // Get user message from request body, or use default initial prompt
      const userMessage = request.body?.message;

      let prompt: string;
      if (!userMessage || userMessage === "initial") {
        // Initial prompt about Chris Barreras
        prompt =
          "In a friendly but professional tone, explain why Chris Barreras would be an excellent fit for a software engineering role. " +
          "Mention his skills in Angular, Firebase, and creating modern user interfaces. " +
          "Keep it concise (2-3 sentences).";
      } else {
        // User's custom message with context about Chris Barreras
        prompt = `You are an AI assistant representing Chris Barreras, a skilled software engineer with expertise in Angular, Firebase, and modern web development. 
        
        User question: ${userMessage}
        
        Please respond in a helpful, professional tone. If the question is about Chris's skills or experience, feel free to mention his work with Angular, Firebase, TypeScript, and modern web technologies.`;
      }

      const result = await model.generateContent(prompt);
      const answer = await result.response.text();

      response.json({answer: answer});
    } catch (error) {
      logger.error("Error calling Gemini API", error);
      response.status(500).json({
        error: "Could not get a response from Gemini: " +
        (error instanceof Error ? error.message : JSON.stringify(error)),
      });
    }
  },
);
