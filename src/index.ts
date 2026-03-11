#!/usr/bin/env node

/**
 * This is an MCP server that provides access to Gyazo images.
 * It offers functionalities such as listing images, reading specific image contents, and retrieving the latest images.
 * The server uses the Gyazo API to fetch image metadata and content.
 * It uses stdio transport to communicate via standard input/output streams.
 * The server is implemented using the MCP SDK.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_CONFIG, setAccessToken } from "./config.js";
import { loadStoredToken, runOAuthFlow } from "./auth.js";
import {
  listResourcesHandler,
  readResourceHandler,
} from "./handlers/resources.js";
import { listToolsHandler, callToolHandler } from "./handlers/tools.js";

/**
 * Create MCP server
 * Provides functionality for resources (listing/getting image content) and tools (getting image metadata)
 */
const server = new Server(
  {
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Set up request handlers
 */
server.setRequestHandler(
  listResourcesHandler.schema,
  listResourcesHandler.handler
);
server.setRequestHandler(
  readResourceHandler.schema,
  readResourceHandler.handler
);
server.setRequestHandler(listToolsHandler.schema, listToolsHandler.handler);
server.setRequestHandler(callToolHandler.schema, callToolHandler.handler);

/**
 * Ensure access token is available, running OAuth flow if needed
 */
async function ensureAccessToken(): Promise<void> {
  if (process.env.GYAZO_ACCESS_TOKEN) {
    return;
  }

  const storedToken = loadStoredToken();
  if (storedToken) {
    setAccessToken(storedToken);
    return;
  }

  const clientId = process.env.GYAZO_CLIENT_ID;
  const clientSecret = process.env.GYAZO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "No access token available. Set GYAZO_ACCESS_TOKEN, or set GYAZO_CLIENT_ID and GYAZO_CLIENT_SECRET for OAuth.",
    );
  }

  const token = await runOAuthFlow(clientId, clientSecret);
  setAccessToken(token);
}

/**
 * Run OAuth authentication flow and exit
 */
async function authMode(): Promise<void> {
  const clientId = process.env.GYAZO_CLIENT_ID;
  const clientSecret = process.env.GYAZO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error(
      "GYAZO_CLIENT_ID and GYAZO_CLIENT_SECRET environment variables are required for OAuth.",
    );
    process.exit(1);
  }

  await runOAuthFlow(clientId, clientSecret);
}

/**
 * Start the server using stdio transport
 * Communicate via standard input/output streams
 */
async function main() {
  if (process.argv.includes("--auth")) {
    await authMode();
    return;
  }

  await ensureAccessToken();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
