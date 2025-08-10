import {GoogleGenerativeAI} from "@google/generative-ai";
import {JobPostData} from "../types/JobPostData";
import {CHRIS_PROFILE, SYSTEM_INSTRUCTION} from "../constants/ChrisProfile";
import {LoggingProxy} from "../utils/LoggingProxy";

export class AIResponseService {
  private model: any;

  constructor(private genAI: GoogleGenerativeAI) {
    // Use gemini-1.5-flash for faster responses (3-5x faster than gemini-2.5-pro)
    const originalModel = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 1000, // Limit response length for faster generation
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });
    this.model = LoggingProxy.create(originalModel, 'GeminiModel');
  }

  async generateResponse(userMessage: string, jobPostData?: JobPostData | null): Promise<string> {
    const prompt = this.buildPrompt(userMessage, jobPostData);
    
    const result = await this.model.generateContent(prompt);
    return await result.response.text();
  }

  private buildPrompt(userMessage: string, jobPostData?: JobPostData | null): string {
    // Sanitize user input to prevent prompt injection
    const sanitizedMessage = this.sanitizeUserInput(userMessage);
    
    // Shorter, more focused prompt for faster processing
    let prompt = `${SYSTEM_INSTRUCTION}\n\nPROFILE:\n${CHRIS_PROFILE}`;

    if (jobPostData) {
      // Truncate job description for faster processing
      const truncatedDescription = jobPostData.jobDescription.substring(0, 800);
      const truncatedRequirements = jobPostData.requirements.substring(0, 400);
      
      prompt += `\n\nJOB DATA:
Company: ${jobPostData.companyName}
Position: ${jobPostData.jobTitle}
Description: ${truncatedDescription}
Requirements: ${truncatedRequirements}`;
    }

    if (!sanitizedMessage || sanitizedMessage === "initial") {
      if (jobPostData) {
        prompt += `\n\nQUESTION: Explain why Chris would be a strong hire for ${jobPostData.companyName}.`;
      } else {
        prompt += `\n\nQUESTION: Explain why Chris would be a strong hire.`;
      }
    } else {
      prompt += `\n\nQUESTION: ${sanitizedMessage}\n\nProvide a concise response about Chris only.`;
    }

    return prompt + ` Format the response using HTML with inline styles. Use:
- <h2 style="font-size: 1.2rem; font-weight: 600; color: #3b82f6; margin: 0.5rem 0 0.75rem 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.25rem; font-family: Segoe UI;">
- <h3 style="font-size: 1.05rem; font-weight: 500; color: #3b82f6; margin: 0.75rem 0 0.5rem 0; font-family: Segoe UI;">
- <strong style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">
- <em style="font-size: 0.95rem; font-style: italic; color: #475569;">
- <ul style="margin: 0.5rem 0; padding-left: 1.25rem; font-size: 0.95rem;">
- <li style="margin-bottom: 0.25rem; line-height: 1.4; font-size: 0.95rem;">
- <p style="margin: 0.5rem 0; line-height: 1.5; font-family: Segoe UI; font-size: 0.95rem;">
Do not include <html>, <h1>, or <body> tags.`;
  }

  private sanitizeUserInput(input: string): string {
    if (!input) return input;
    
    // Remove potential prompt injection attempts
    return input
      .replace(/\n\n/g, ' ') // Remove double newlines
      .replace(/SYSTEM[:\s]/gi, '') // Remove "SYSTEM:" attempts
      .replace(/INSTRUCTION[:\s]/gi, '') // Remove "INSTRUCTION:" attempts
      .replace(/IGNORE[:\s]/gi, '') // Remove "IGNORE:" attempts
      .replace(/FORGET[:\s]/gi, '') // Remove "FORGET:" attempts
      .substring(0, 500) // Limit length
      .trim();
  }
}