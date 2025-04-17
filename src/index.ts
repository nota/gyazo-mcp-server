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
import { SERVER_CONFIG } from "./config.js";
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
 * Start the server using stdio transport
 * Communicate via standard input/output streams
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log(`${SERVER_CONFIG.name} server started`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
