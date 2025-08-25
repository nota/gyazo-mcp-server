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
import { GyazoNativeMCPServer } from "./capture-proxy.js";

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
}

// Setup cleanup handlers for graceful shutdown
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

// Cleanup function for graceful shutdown
function cleanup() {
  // Clean up the native MCP server if it was initialized
  const nativeServer = GyazoNativeMCPServer.getInstance();
  if (nativeServer) {
    nativeServer.cleanup();
  }
}

main().catch((error) => {
  // stdioを汚染しないため標準エラー出力を使用（process.stderrは非同期APIでstdioと分離されている）
  process.stderr.write(`Server error: ${error}\n`);
  process.exit(1);
});
