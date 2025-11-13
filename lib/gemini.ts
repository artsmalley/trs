import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Get Gemini 2.5 Flash model instance
export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Stable model (will update to gemini-3.0 when available)
});

// File manager for File Search
// TODO: Implement File Search integration when ready
// The File API is available through the Gemini Files API
// See: https://ai.google.dev/gemini-api/docs/file-search
export const fileManager = null; // Placeholder - will implement with Upload Agent

// Export the client for direct access if needed
export { genAI };
