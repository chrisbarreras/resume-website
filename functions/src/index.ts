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
CHRIS BARRERAS - PROFESSIONAL PROFILE

EDUCATION & CERTIFICATIONS:
- Bachelor's degree in Computer Science
- Multiple industry certifications in web development and cloud technologies
- Continuous learner who stays current with emerging technologies

TECHNICAL EXPERTISE:
- Frontend Development: Expert in Angular (latest versions), TypeScript, JavaScript, HTML5, CSS3, SCSS
- Backend Development: Node.js, Firebase Functions, RESTful APIs
- Cloud Platforms: Google Firebase (Firestore, Authentication, Hosting, Functions), Google Cloud Platform
- Database Technologies: Firestore, SQL databases, NoSQL databases
- Version Control: Git, GitHub, collaborative development workflows
- Modern Development: Responsive design, Progressive Web Apps (PWAs), mobile-first approach
- UI/UX: Modern user interface design, user experience optimization, accessibility best practices
- Development Tools: VS Code, Angular CLI, npm/yarn, build tools and automation

NOTABLE PROJECTS:
- Interactive Resume Website: Built a sophisticated Angular-based portfolio with dynamic components, PDF viewer integration, image optimization, and real-time AI assistant powered by Google's Gemini AI
- Firebase Integration Specialist: Extensive experience with Firebase ecosystem including real-time databases, cloud functions, authentication systems, and deployment pipelines
- Modern Web Applications: Developed responsive, scalable web applications using latest Angular features like standalone components, signals, and modern routing
- Image Optimization Systems: Created automated image processing pipelines for web performance optimization
- AI Integration: Successfully integrated Google's Gemini AI API for intelligent resume assistance and job matching

PROFESSIONAL QUALITIES:
- Problem Solver: Excels at breaking down complex technical challenges into manageable solutions
- Clean Code Advocate: Writes maintainable, well-documented code following industry best practices
- Performance Focused: Optimizes applications for speed, accessibility, and user experience
- Collaborative Team Player: Works effectively in agile environments and cross-functional teams
- Innovation Minded: Embraces new technologies and methodologies to deliver cutting-edge solutions
- Detail Oriented: Ensures high-quality deliverables through thorough testing and code review
- Communication Skills: Effectively communicates technical concepts to both technical and non-technical stakeholders

PROFESSIONAL EXPERIENCE:
- Extensive experience in full-stack web development with focus on modern JavaScript frameworks
- Proven track record of delivering scalable, maintainable applications
- Experience with project management and leading technical initiatives
- Strong background in cloud architecture and serverless computing
- Expertise in modern development workflows including CI/CD, automated testing, and deployment strategies

PERSONAL INTERESTS & APPROACH:
- Passionate about creating intuitive user experiences that solve real-world problems
- Enjoys mentoring other developers and sharing knowledge through documentation and code examples
- Believes in the power of technology to improve people's lives and business processes
- Committed to writing code that is not just functional, but elegant and maintainable
- Active in the developer community and stays current with industry trends and best practices

CAREER GOALS:
- Seeking opportunities to work with cutting-edge technologies in a collaborative environment
- Interested in roles that combine technical expertise with meaningful impact
- Values companies that prioritize innovation, code quality, and professional growth
- Excited about contributing to teams that are building the future of web technology
`;

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
      "http://localhost:4200",
      "http://127.0.0.1:4200",
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

      logger.info("API key found, initializing Gemini AI");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});

      // Get user message and job post ID from request body
      const userMessage = request.body?.message;
      const jobPostId = request.body?.jobPostId;

      let jobPostData: JobPostData | null = null;

      // If there's a job post ID, try to scrape the job posting
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

      let prompt: string;
      const responseData: {answer?: string; companyName?: string} = {};

      if (!userMessage || userMessage === "initial") {
        // Initial prompt - customize based on whether we have job data
        if (jobPostData) {
          responseData.companyName = jobPostData.companyName;
          prompt = `You are Chris Barreras' AI assistant, helping potential employers understand why Chris would be an excellent fit for their team.

CHRIS'S BACKGROUND:
${CHRIS_PROFILE}

SPECIFIC JOB OPPORTUNITY:
Company: ${jobPostData.companyName}
Position: ${jobPostData.jobTitle}
Job Description: ${jobPostData.jobDescription}
Requirements: ${jobPostData.requirements}

As Chris's AI assistant, provide a compelling explanation of why Chris would be an excellent fit for this specific role at ${jobPostData.companyName}. 
Focus on how his technical skills, project experience, and professional qualities align with their job requirements.
Be specific about relevant technologies and experiences from his background that match their needs.
Keep the response professional but conversational (4-5 sentences).`;
        } else {
          prompt = `You are Chris Barreras' AI assistant, here to help potential employers learn about Chris and his qualifications.

CHRIS'S BACKGROUND:
${CHRIS_PROFILE}

A potential employer is visiting Chris's resume website. As his AI assistant, provide a compelling overview of why Chris would be an excellent addition to any development team.
Highlight his strongest technical skills, notable projects, and professional qualities that make him stand out as a software engineer.
Be enthusiastic but professional in your response (3-4 sentences).`;
        }
      } else {
        // User's custom message with full context about Chris Barreras
        let contextInfo = `You are Chris Barreras' AI assistant. Your role is to answer questions about Chris and help potential employers understand his qualifications and experience.

COMPLETE BACKGROUND ABOUT CHRIS:
${CHRIS_PROFILE}`;

        if (jobPostData) {
          contextInfo += `

CURRENT JOB CONTEXT:
The person asking is a potential employer from ${jobPostData.companyName} considering Chris for a "${jobPostData.jobTitle}" position.
Job Details: ${jobPostData.jobDescription.substring(0, 500)}
Job Requirements: ${jobPostData.requirements.substring(0, 300)}`;
        }

        prompt = `${contextInfo}

EMPLOYER QUESTION: ${userMessage}

As Chris's AI assistant, please answer this question in a helpful and professional manner. Draw from Chris's background, skills, and experience detailed above. 
${jobPostData ? "When relevant, explain how Chris's qualifications align with the specific job requirements." : "Focus on how Chris's skills and experience would benefit their organization."}
Be conversational but professional in your response.`;
      }

      const result = await model.generateContent(prompt);
      const answer = await result.response.text();

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
