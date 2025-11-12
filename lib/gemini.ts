import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Get Gemini 2.5 Flash model instance
export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-exp", // Will update to gemini-3.0 when available
});

// File manager for Google AI File API
export const fileManager = genAI.fileManager;

// Export the client for direct access if needed
export { genAI };
