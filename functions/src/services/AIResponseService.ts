import {GoogleGenerativeAI} from "@google/generative-ai";
import {JobPostData} from "../types/JobPostData";
import {CHRIS_PROFILE, SYSTEM_INSTRUCTION} from "../constants/ChrisProfile";

export class AIResponseService {
  constructor(private genAI: GoogleGenerativeAI) {}

  async generateResponse(userMessage: string, jobPostData?: JobPostData | null): Promise<string> {
    const model = this.genAI.getGenerativeModel({model: "gemini-2.5-pro"});
    const prompt = this.buildPrompt(userMessage, jobPostData);
    
    const result = await model.generateContent(prompt);
    return await result.response.text();
  }

  private buildPrompt(userMessage: string, jobPostData?: JobPostData | null): string {
    let prompt = `${SYSTEM_INSTRUCTION}\n\nPROFILE:\n${CHRIS_PROFILE}`;

    if (jobPostData) {
      prompt += `\n\nJOB DATA (if relevant to answer):
Company: ${jobPostData.companyName}
Position: ${jobPostData.jobTitle}
Job Description: ${jobPostData.jobDescription}
Requirements: ${jobPostData.requirements}`;
    }

    if (!userMessage || userMessage === "initial") {
      if (jobPostData) {
        prompt += `\n\nQUESTION:\nPlease explain concisely why Chris Barreras would be a strong hire for this role at ${jobPostData.companyName}.`;
      } else {
        prompt += `\n\nQUESTION:\nPlease explain concisely why Chris Barreras would be a strong hire for this role.`;
      }
    } else {
      prompt += `\n\nQUESTION:\n${userMessage}`;
    }

    return prompt;
  }
}