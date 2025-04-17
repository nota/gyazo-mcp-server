/**
 * Configuration related processing
 */
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Gyazo API access token
export const GYAZO_ACCESS_TOKEN = process.env.GYAZO_ACCESS_TOKEN;

// Gyazo API endpoints
export const API_ENDPOINTS = {
  IMAGES: "https://api.gyazo.com/api/images",
  SEARCH: "https://api.gyazo.com/api/search",
  UPLOAD: "https://upload.gyazo.com/api/upload",
  IMAGE: (id: string) => `https://api.gyazo.com/api/images/${id}`,
};

// MCP server configuration
export const SERVER_CONFIG = {
  name: "gyazo-mcp-server",
  version: "0.1.0",
};

// Verify access token exists
if (!GYAZO_ACCESS_TOKEN) {
  throw new Error("GYAZO_ACCESS_TOKEN environment variable is required");
}
