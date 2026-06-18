/**
 * Configuration related processing
 */
import dotenv from "dotenv";
import { loadStoredToken } from "./auth.js";

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

// Cached access token set by OAuth flow
let cachedAccessToken: string | null = null;

/**
 * Set access token (called after OAuth flow completes)
 */
export function setAccessToken(token: string): void {
  cachedAccessToken = token;
}

/**
 * Get Gyazo API access token
 * Priority: env var > cached OAuth token > stored OAuth token
 */
export function getAccessToken(): string {
  const envToken = process.env.GYAZO_ACCESS_TOKEN;
  if (envToken) {
    return envToken;
  }

  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  const storedToken = loadStoredToken();
  if (storedToken) {
    cachedAccessToken = storedToken;
    return storedToken;
  }

  throw new Error(
    "No access token available. Set GYAZO_ACCESS_TOKEN or configure GYAZO_CLIENT_ID and GYAZO_CLIENT_SECRET for OAuth.",
  );
}
