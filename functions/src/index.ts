import dotenv from "dotenv";
dotenv.config();
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {GoogleGenerativeAI} from "@google/generative-ai";
import * as functions from "firebase-functions";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Comprehensive profile information about Chris Barreras
 */
const CHRIS_PROFILE = `
You are the AI assistant for Chris Barreras. You only answer questions about Chris,
his background, projects, skills, experience, education, certifications and
job-fit explanations. If asked anything unrelated, you must refuse.
Summary:
- Name: Chris Barreras
- Degree/Certs: Bachelor's degree in Computer Science from Franciscan University of Steubenville, Generative AI with Large Language Models by DeepLearning.AI and AWS, BigQuery Soccer Data Ingestion by Google Cloud, Classify Images of Cats and Dogs using Transfer Learning by Google Cloud, Creating a Data Warehouse Through Joins and Unions by Google Cloud, Spring Boot with Embedded Database by Coursera Project Network
- Skills: Angular, TypeScript, Firebase, Node.js, CSS, HTML, Git, CI/CD, testing, JavaScript, HTML5, CSS3, SCSS, RESTful APIs, Google Cloud Platform, Firestore, SQL databases, NoSQL databases, responsive design, Progressive Web Apps (PWAs), mobile-first approach, UI/UX, modern user interface design, user experience optimization, accessibility best practices, VS Code, Angular CLI, npm/yarn, build tools and automation
- Projects: Resume website (Angular + Firebase), AI assistant for job matching, image optimization, Interactive Resume Website with dynamic components and PDF viewer integration, Firebase Integration specialist, Modern Web Applications with latest Angular features, Image Optimization Systems, AI Integration with Google's Gemini AI API
- Experience: Full-stack web development, scalable maintainable applications, project management, cloud architecture, serverless computing, modern development workflows including CI/CD, automated testing, deployment strategies
- Qualities: problem solving, clean code, performance, accessibility, teamwork, innovation minded, detail oriented, communication skills, passionate about creating intuitive user experiences, mentoring other developers, writing elegant and maintainable code, active in developer community
`;

// Embedding setup to semantically check if a question is about Chris
let profileEmbedding: number[] | null = null;

// Cache embeddings in memory with expiration
const EMBEDDING_CACHE = new Map<string, { embedding: number[], timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// async function getEmbedding(text: string, genAI: GoogleGenerativeAI): Promise<number[]> {
//   const model = genAI.getGenerativeModel({model: "text-embedding-004"});
//   const {embedding} = await model.embedContent(text);
//   return embedding.values as number[];
// }

function cosineSim(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return dot / (na * nb);
}

async function getCachedEmbedding(text: string, genAI: GoogleGenerativeAI): Promise<number[]> {
  const now = Date.now();
  const cached = EMBEDDING_CACHE.get(text);

  // Return cached if still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.embedding;
  }

  // Generate new embedding
  const model = genAI.getGenerativeModel({model: "text-embedding-004"});
  const {embedding} = await model.embedContent(text);
  const embeddingValues = embedding.values as number[];

  // Cache the result
  EMBEDDING_CACHE.set(text, {embedding: embeddingValues, timestamp: now});

  // Clean old cache entries periodically
  if (EMBEDDING_CACHE.size > 100) {
    for (const [key, value] of EMBEDDING_CACHE.entries()) {
      if ((now - value.timestamp) > CACHE_DURATION) {
        EMBEDDING_CACHE.delete(key);
      }
    }
  }

  return embeddingValues;
}

async function ensureProfileEmbedding(genAI: GoogleGenerativeAI) {
  if (!profileEmbedding) {
    profileEmbedding = await getCachedEmbedding(CHRIS_PROFILE, genAI);
  }
}

// Lightweight keyword check to catch obvious cases fast
function keywordAboutChris(q: string) {
  const s = q.toLowerCase();
  const keywords = [
    "chris", "barreras", "your experience", "your resume", "your skills",
    "projects you built", "why you", "about you", "portfolio", "employment history",
    "angular", "typescript", "firebase", "developer", "programming", "software",
    "education", "certification", "job fit", "hire", "candidate", "qualifications",
    "background", "work history", "technical skills", "frontend", "fullstack",
  ];
  return keywords.some((k) => s.includes(k));
}

// Enhanced quick rejection for obviously unrelated questions
function quickRejectUnrelated(q: string): boolean {
  const s = q.toLowerCase();
  const unrelatedKeywords = [
    "weather", "news", "sports", "cooking", "recipe", "movie", "music",
    "politics", "health", "medical", "legal", "financial advice",
    "what time", "current events", "stock market", "cryptocurrency",
  ];
  return unrelatedKeywords.some((k) => s.includes(k));
}

// Semantic gate: only allow if question is about Chris
async function isAboutChris(question: string, genAI: GoogleGenerativeAI): Promise<boolean> {
  logger.info("Checking if question is about Chris", {question});
  if (!question || question.trim().length === 0) return true; // default pitch flow

  // Fast keyword check first
  if (keywordAboutChris(question)) return true;

  // Quick rejection for obviously unrelated topics
  if (quickRejectUnrelated(question)) return false;

  // Only do expensive embedding comparison for ambiguous cases
  try {
    await ensureProfileEmbedding(genAI);
    const qEmb = await getCachedEmbedding(question, genAI);
    const sim = cosineSim(profileEmbedding!, qEmb);

    // Slightly more permissive threshold since we pre-filtered obvious cases
    return sim >= 0.58;
  } catch (error) {
    logger.warn("Embedding comparison failed, defaulting to keyword check", {error});
    // Fallback to keyword-only check if embedding fails
    return keywordAboutChris(question);
  }
}

// Strict system prompt to enforce refusal on unrelated queries
const SYSTEM_INSTRUCTION = `
You are "Chris Barreras' AI Assistant". Your job is to answer only questions about Chris:
his work history, skills, projects, achievements, education, certifications, and job-fit.
If the user asks anything not about Chris, politely refuse with one sentence like:
"I'm only able to answer questions about Chris Barreras."

Refusal examples:
Q: What's the weather in New York?
A: I'm only able to answer questions about Chris Barreras.

Q: Explain Kubernetes pod scheduling.
A: I'm only able to answer questions about Chris Barreras.

Q: What are Chris's main front-end strengths?
A: [Answer about Chris based on the provided profile and context.]
`;

/**
 * Structure for scraped job post data
 */
interface JobPostData {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  requirements: string;
  originalUrl: string;
}

/**
 * Function to expand TinyURL and get original URL
 * @param {string} tinyUrlId - The TinyURL identifier
 * @return {Promise<string>} The expanded URL
 */
async function expandTinyUrl(tinyUrlId: string): Promise<string> {
  try {
    const tinyUrl = `https://tinyurl.com/${tinyUrlId}`;
    logger.info("Attempting to expand TinyURL", {tinyUrl});

    const response = await axios.get(tinyUrl, {
      maxRedirects: 0,
      validateStatus: (status: number) => status === 302 || status === 301 || status === 200,
      timeout: 10000, // 10 second timeout
    });

    logger.info("TinyURL response", {
      status: response.status,
      headers: response.headers,
      location: response.headers.location,
    });

    // If we got a redirect, return the location
    if (response.headers.location) {
      return response.headers.location;
    }

    // If we got a 200 response, it might be an error page
    if (response.status === 200) {
      logger.warn("TinyURL returned 200 status, might be invalid", {tinyUrlId});
      return tinyUrl; // Return original if no redirect
    }

    return tinyUrl;
  } catch (error: any) {
    logger.warn("Failed to expand TinyURL", {tinyUrlId, error: error.message});

    // If it's a redirect error, try to extract the location from the error
    if (error.response && error.response.headers && error.response.headers.location) {
      logger.info("Found redirect location in error response", {location: error.response.headers.location});
      return error.response.headers.location;
    }

    return `https://tinyurl.com/${tinyUrlId}`;
  }
}

/**
 * Function to scrape job post content
 * @param {string} url - The URL to scrape
 * @return {Promise<JobPostData | null>} The scraped job data or null
 */
async function scrapeJobPost(url: string): Promise<JobPostData | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    let companyName = "";
    let jobTitle = "";
    let jobDescription = "";
    let requirements = "";

    // Log some debug info about the page structure
    logger.info("Page title", {title: $("title").text()});
    logger.info("Page h1 elements", {h1Elements: $("h1").map((_, el) => $(el).text()).get()});
    logger.info("Page h2 elements", {h2Elements: $("h2").map((_, el) => $(el).text()).get()});
    logger.info("Page meta tags", {
      description: $("meta[name='description']").attr("content"),
      ogTitle: $("meta[property='og:title']").attr("content"),
      ogDescription: $("meta[property='og:description']").attr("content"),
    });

    // LinkedIn job post scraping
    if (url.includes("linkedin.com")) {
      companyName = $("a[data-tracking-control-name='job-details-job-info-company-name'] h4").text().trim() ||
                   $(".job-details-jobs-unified-top-card__company-name a").text().trim() ||
                   $(".jobs-unified-top-card__company-name a").text().trim();

      jobTitle = $("h1.jobs-unified-top-card__job-title").text().trim() ||
                $("h2[data-tracking-control-name='public_jobs_job-title']").text().trim();

      jobDescription = $(".jobs-description-content__text").text().trim() ||
                      $(".jobs-box__html-content").text().trim();
    } else if (url.includes("indeed.com")) {
      // Indeed job post scraping
      companyName = $("div[data-testid='inlineHeader-companyName'] a").text().trim() ||
                   $(".jobsearch-CompanyInfoContainer a").text().trim();

      jobTitle = $("h1[data-testid='jobsearch-JobInfoHeader-title']").text().trim() ||
                $(".jobsearch-JobInfoHeader-title").text().trim();

      jobDescription = $("div[data-testid='jobsearch-jobDescriptionText']").text().trim() ||
                      $("#jobDescriptionText").text().trim();
    } else if (url.includes("myworkdayjobs.com")) {
      // Workday job post scraping - these sites are heavily JavaScript-rendered
      // Extract company from URL pattern since content might not be available in static HTML
      const urlMatch = url.match(/\/\/(.*?)\.myworkdayjobs\.com/);
      const companyFromUrl = urlMatch?.[1];

      // Common company name mappings
      const companyMappings: {[key: string]: string} = {
        "hp": "HP Inc.",
        "hp.wd5": "HP Inc.",
        "microsoft": "Microsoft",
        "google": "Google",
        "amazon": "Amazon",
        "meta": "Meta",
        "apple": "Apple",
        "salesforce": "Salesforce",
        "oracle": "Oracle",
        "ibm": "IBM",
        "intel": "Intel",
      };

      companyName = companyMappings[companyFromUrl?.toLowerCase() || ""] ||
                   (companyFromUrl ? companyFromUrl.replace(/\.wd\d+/i, "").toUpperCase() + " Inc." : "") ||
                   $("title").text().split(" - ")[0]?.trim() ||
                   "Unknown Company";

      // Try to extract job title from URL or title - look for the job role part
      const urlParts = url.split("/");
      const jobRolePart = urlParts.find((part) =>
        part.includes("-") &&
        part.length > 15 &&
        !part.includes("Texas") &&
        !part.includes("United-States") &&
        !part.includes("Spring")
      );
      // Clean job title from URL - remove ID and query parameters
      const jobTitleFromUrl = jobRolePart?.replace(/_\d+(\?.*)?$/, "").replace(/-/g, " ");

      jobTitle = $("[data-automation-id='jobPostingHeader']").text().trim() ||
                $("h1").first().text().trim() ||
                $("title").text().split(" - ")[1]?.trim() ||
                (jobTitleFromUrl ? jobTitleFromUrl.split(" ").map((word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(" ") : "") ||
                "Software Development Position";

      // Clean job title to remove any URL artifacts
      jobTitle = jobTitle.replace(/[?&].*$/, "").replace(/_\d+.*$/, "").replace(/\s+/g, " ").trim();

      jobDescription = $("[data-automation-id='jobPostingDescription']").text().trim() ||
                      $(".jobPostingDescription").text().trim() ||
                      $("[data-automation-id='jobDescription']").text().trim() ||
                      `Join ${companyName} as a ${jobTitle}. This position offers exciting opportunities to work with cutting-edge technology and make a meaningful impact.`;
    } else {
      // Generic scraping for other sites
      // Try common selectors for company name
      const companyElements = $("h1, h2, h3");
      let foundCompanyName = "";
      companyElements.each((_, element) => {
        const text = $(element).text().toLowerCase();
        if (text.includes("company") || text.includes("employer")) {
          foundCompanyName = $(element).text().trim();
          return false; // Break the loop
        }
        return true; // Continue the loop
      });
      companyName = foundCompanyName;

      // Try common selectors for job title
      jobTitle = $("h1").first().text().trim() ||
                $("title").text().trim();

      // Try to get main content
      jobDescription = $("main").text().trim() ||
                      $(".content").text().trim() ||
                      $("article").text().trim() ||
                      $("body").text().trim();
    }

    // Extract requirements from description if no separate section
    if (jobDescription && !requirements) {
      const descLower = jobDescription.toLowerCase();
      const reqStart = Math.max(
        descLower.indexOf("requirements"),
        descLower.indexOf("qualifications"),
        descLower.indexOf("skills"),
        descLower.indexOf("experience")
      );

      if (reqStart !== -1) {
        requirements = jobDescription.substring(reqStart, reqStart + 1000);
      }
    }

    // Clean up extracted text
    companyName = companyName.replace(/\s+/g, " ").trim();
    jobTitle = jobTitle.replace(/\s+/g, " ").trim();
    jobDescription = jobDescription.replace(/\s+/g, " ").trim().substring(0, 2000);
    requirements = requirements.replace(/\s+/g, " ").trim().substring(0, 1000);

    // Additional debugging for Workday sites
    if (url.includes("myworkdayjobs.com")) {
      logger.info("Workday extraction results", {
        companyName,
        jobTitle,
        jobDescription: jobDescription.substring(0, 200) + "...",
        urlPattern: url.match(/\/\/(.*?)\.myworkdayjobs\.com/)?.[1],
      });
    }

    // Ensure we always have some data for known job sites
    if (!companyName && !jobTitle && !jobDescription) {
      // For Workday sites, provide fallback data based on URL
      if (url.includes("myworkdayjobs.com")) {
        const urlMatch = url.match(/\/\/(.*?)\.myworkdayjobs\.com/);
        const companyFromUrl = urlMatch?.[1];

        return {
          companyName: companyFromUrl ? companyFromUrl.toUpperCase() : "Unknown Company",
          jobTitle: "Software Development Position",
          jobDescription: `Exciting opportunity to join ${companyFromUrl ? companyFromUrl.toUpperCase() : "our team"} as a software developer. This role involves working with modern technologies and contributing to innovative projects.`,
          requirements: "Bachelor's degree in Computer Science or related field, programming experience, problem-solving skills",
          originalUrl: url,
        };
      }
      return null;
    }

    return {
      companyName: companyName || "Unknown Company",
      jobTitle: jobTitle || "Unknown Position",
      jobDescription,
      requirements,
      originalUrl: url,
    };
  } catch (error) {
    logger.error("Error scraping job post", {url, error});
    return null;
  }
}

export const getFitAnswer = onRequest(
  {
    cors: [
      "https://resume-632d7.web.app",
      "https://resume-632d7.firebaseapp.com",
      "http://barreras.codes",
      "https://barreras.codes",
      "http://localhost:5000"
    ],
  },
  async (request, response) => {
    logger.info("Received request for Gemini answer", {
      structuredData: true,
      origin: request.headers.origin,
      method: request.method,
      body: request.body,
    });

    try {
      // Try multiple methods to get the API key
      let apiKey = process.env.GEMINI_API_KEY; // Local development

      // If not found in env, try Firebase config (production)
      if (!apiKey) {
        try {
          const config = functions.config();
          apiKey = config.gemini?.api_key;
          logger.info("Using Firebase config for API key");
        } catch (configError) {
          logger.warn("Firebase config not available", configError);
        }
      } else {
        logger.info("Using environment variable for API key");
      }

      if (!apiKey) {
        logger.error("GEMINI_API_KEY not found in environment or config");
        response.status(500).json({
          error: "Server configuration error: API key not found",
        });
        return;
      }

      logger.info("API key found, initializing Gemini AI!!");
      const genAI = new GoogleGenerativeAI(apiKey);

      // Get user message and job post ID from request body
      const userMessage = request.body?.message;
      const jobPostId = request.body?.jobPostId;

      // Gate: if question isn't about Chris, refuse before calling the model
      // Skip filtering for initial/auto-generated messages
      logger.info("Checking if user message is about Chris", {userMessage, jobPostId});
      if (userMessage && userMessage !== "initial" && userMessage.trim().length > 0) {
        const startTime = Date.now();
        const allowed = await isAboutChris(userMessage, genAI);
        const filterTime = Date.now() - startTime;
        logger.info("Semantic filtering completed", {filterTime, allowed});

        if (!allowed) {
          response.status(400).json({
            error: "I'm only able to answer questions about Chris Barreras.",
          });
          return;
        }
      }

      // Process job post ID to scrape job posting if available
      let jobPostData: JobPostData | null = null;

      if (jobPostId) {
        try {
          logger.info("Processing job post", {jobPostId});
          const originalUrl = await expandTinyUrl(jobPostId);
          logger.info("Expanded URL", {originalUrl});

          // Only try to scrape if we got a valid expanded URL
          if (originalUrl && originalUrl !== `https://tinyurl.com/${jobPostId}`) {
            jobPostData = await scrapeJobPost(originalUrl);
            logger.info("Scraped job data", {jobPostData});
          } else {
            logger.warn("TinyURL expansion failed or returned original URL", {jobPostId, originalUrl});
          }
        } catch (error) {
          logger.warn("Failed to process job post", {jobPostId, error});
        }
      }

      // Build model input (RAG-style: system + profile + optional job data + user)
      const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});
      const responseData: {answer?: string; companyName?: string} = {};

      let prompt: string;

      if (!userMessage || userMessage === "initial") {
        // Initial prompt - customize based on whether we have job data
        if (jobPostData) {
          responseData.companyName = jobPostData.companyName;
          prompt = `${SYSTEM_INSTRUCTION}

PROFILE:
${CHRIS_PROFILE}

JOB DATA (if relevant to answer):
Company: ${jobPostData.companyName}
Position: ${jobPostData.jobTitle}
Job Description: ${jobPostData.jobDescription}
Requirements: ${jobPostData.requirements}

QUESTION:
Please explain concisely why Chris Barreras would be a strong hire for this role at ${jobPostData.companyName}.`;
        } else {
          prompt = `${SYSTEM_INSTRUCTION}

PROFILE:
${CHRIS_PROFILE}

QUESTION:
Please explain concisely why Chris Barreras would be a strong hire for this role.`;
        }
      } else {
        // User's custom message with full context about Chris Barreras
        prompt = `${SYSTEM_INSTRUCTION}

PROFILE:
${CHRIS_PROFILE}`;

        if (jobPostData) {
          prompt += `

JOB DATA (if relevant to answer):
Company: ${jobPostData.companyName}
Position: ${jobPostData.jobTitle}
Job Description: ${jobPostData.jobDescription.substring(0, 500)}
Requirements: ${jobPostData.requirements.substring(0, 300)}`;
        }

        prompt += `

QUESTION:
${userMessage}`;
      }

      const result = await model.generateContent(prompt);
      const answer = await result.response.text();

      // Skip post-check for performance - rely on system instructions and pre-filtering
      responseData.answer = answer;
      response.json(responseData);
    } catch (error) {
      logger.error("Error calling Gemini API", error);
      response.status(500).json({
        error: "Could not get a response from Gemini: " +
        (error instanceof Error ? error.message : JSON.stringify(error)),
      });
    }
  },
);
