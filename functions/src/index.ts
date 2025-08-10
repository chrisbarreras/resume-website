import dotenv from "dotenv";
dotenv.config();
import {onRequest} from "firebase-functions/v2/https";
import {HttpRequestHandler} from "./handlers/HttpRequestHandler";
import {LoggingProxy} from "./utils/LoggingProxy";
import {Logger} from "./utils/Logger";

// Initialize logger
const log = Logger.create('Main');

// Export the controller for potential testing/reuse
export {FitAnswerController} from "./controllers/FitAnswerController";

const ALLOWED_ORIGINS = [
  "https://resume-632d7.web.app",
  "https://resume-632d7.firebaseapp.com",
  "http://barreras.codes",
  "https://barreras.codes",
  "http://localhost:5000",
  "https://chris.barreras.codes",
  "http://chris.barreras.codes",
];

export const getFitAnswer = onRequest(
  {
    cors: ALLOWED_ORIGINS,
    maxInstances: 3,
  },
  async (request, response) => {
    log.info('getFitAnswer', 'Received request', {
      origin: request.headers.origin,
      method: request.method,
      clientIP: request.ip,
      requestBody: request.body
    });
    const handler = LoggingProxy.create(new HttpRequestHandler(), 'HttpRequestHandler', false);
    await handler.handleRequest(request, response);
  }
);