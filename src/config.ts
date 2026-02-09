/**
 * Configuration related processing
 */
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

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

/**
 * Get Gyazo API access token
 * Validates that the token exists and throws an error if not
 */
export function getAccessToken(): string {
  const token = process.env.GYAZO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("GYAZO_ACCESS_TOKEN environment variable is required");
  }
  return token;
}
