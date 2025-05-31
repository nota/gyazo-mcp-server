/**
 * Module for interfacing with native Gyazo MCPServer (Windows/macOS)
 */
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { join } from "path";

// Debug logging utility
const DEBUG = process.env.GYAZO_DEBUG === "true";
const debugLog = (message: string, ...args: any[]) => {
  if (DEBUG) {
    console.error(`[GYAZO-DEBUG] ${message}`, ...args);
  }
};

// Path constants (with environment variable override support)
const WIN_GYAZO_MCP_SERVER_PATH =
  process.env.GYAZO_WIN_MCP_SERVER_PATH ||
  "C:\\Program Files (x86)\\Gyazo\\GyazoWinMCPServer.exe";
const MAC_GYAZO_MCP_SERVER_PATH =
  process.env.GYAZO_MAC_MCP_SERVER_PATH ||
  "/Applications/Gyazo Menu.app/Contents/Helpers/cli-tool/GyazoMacMCPServer";

// Docker volume mount paths (for cross-platform Docker support)
const DOCKER_WIN_MCP_SERVER_PATH = "/host/gyazo/GyazoWinMCPServer.exe";
const DOCKER_MAC_MCP_SERVER_PATH = "/host/gyazo/GyazoMacMCPServer";

// Type definitions
export type MCPRequest = {
  method: string;
  params: any;
};

export type MCPResponse = {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
};

// Class to manage native MCP server process
export class GyazoNativeMCPServer {
  private static instance: GyazoNativeMCPServer | null = null;
  private childProcess: ChildProcess | null = null;
  private pendingRequests: Map<
    string,
    { resolve: Function; reject: Function }
  > = new Map();
  private requestCounter = 0;
  private buffers: string[] = [];
  private _isAvailable: boolean = false;

  private constructor() {}

  // Singleton pattern
  public static getInstance(): GyazoNativeMCPServer {
    if (!GyazoNativeMCPServer.instance) {
      GyazoNativeMCPServer.instance = new GyazoNativeMCPServer();
    }
    return GyazoNativeMCPServer.instance;
  }

  // Check if native MCP server is available
  public get isAvailable(): boolean {
    return this._isAvailable;
  }

  // Initialize and connect to the native MCP server
  public async initialize(): Promise<boolean> {
    debugLog("Initializing native MCP server...");
    const serverPath = this.getServerPath();
    debugLog("Server path:", serverPath);

    if (!serverPath) {
      debugLog("No server path found, initialization failed");
      this._isAvailable = false;
      return false;
    }

    try {
      debugLog("Starting child process with path:", serverPath);
      // Start the child process
      this.childProcess = spawn(serverPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Set up event listeners
      this.childProcess.stdout?.on("data", (data: Buffer) => {
        debugLog("Received stdout data:", data.toString());
        const messages = data.toString().split("\n");

        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          if (!message.trim()) continue;

          // Last message might be incomplete
          if (i === messages.length - 1 && !message.endsWith("}")) {
            this.buffers.push(message);
            continue;
          }

          // If we have buffered data, combine it with the current message
          if (this.buffers.length > 0) {
            this.buffers.push(message);
            const completeMessage = this.buffers.join("");
            debugLog("Processing buffered message:", completeMessage);
            this.buffers = [];
            this.handleResponse(completeMessage);
          } else {
            debugLog("Processing message:", message);
            this.handleResponse(message);
          }
        }
      });

      this.childProcess.stderr?.on("data", (data: Buffer) => {
        debugLog("Received stderr data:", data.toString());
        // stdioを汚染しないよう、標準出力にはログを出力しない
      });

      this.childProcess.on("close", (code: number) => {
        debugLog("Child process closed with code:", code);
        // stdioを汚染しないよう、標準出力にはログを出力しない
        this.childProcess = null;
        this._isAvailable = false;
      });

      // Ping the server to ensure it's working
      debugLog("Sending ping to server...");
      await this.sendRequest({
        method: "mcp.listTools",
        params: {},
      });

      debugLog("Server initialization successful");
      this._isAvailable = true;
      return true;
    } catch (error) {
      debugLog("Server initialization failed:", error);
      // stdioを汚染しないよう、標準出力にはログを出力しない
      this._isAvailable = false;
      return false;
    }
  }

  // Send a request to the native MCP server
  public async sendRequest(request: MCPRequest): Promise<any> {
    if (!this.childProcess || !this.isAvailable) {
      throw new Error("Native MCP server is not available");
    }

    return new Promise((resolve, reject) => {
      const id = (this.requestCounter++).toString();
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method: request.method,
        params: request.params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      const requestString = JSON.stringify(jsonRpcRequest) + "\n";
      this.childProcess?.stdin?.write(requestString);
    });
  }

  // Handle response from the native MCP server
  private handleResponse(data: string): void {
    try {
      debugLog("Parsing response:", data);
      const response = JSON.parse(data);
      const id = response.id as string;
      const pendingRequest = this.pendingRequests.get(id);

      if (pendingRequest) {
        if (response.error) {
          debugLog("Response error for request", id, ":", response.error);
          pendingRequest.reject(new Error(response.error.message));
        } else {
          debugLog("Response success for request", id, ":", response.result);
          pendingRequest.resolve(response.result);
        }
        this.pendingRequests.delete(id);
      } else {
        debugLog("No pending request found for id:", id);
      }
    } catch (error) {
      debugLog("Failed to parse response:", error, "Data:", data);
      // stdioを汚染しないよう、標準出力にはログを出力しない
    }
  }

  // Get the path to the native MCP server based on OS
  private getServerPath(): string | null {
    const os = platform();

    // Check for explicit environment variable override first
    if (process.env.GYAZO_MCP_SERVER_PATH) {
      return existsSync(process.env.GYAZO_MCP_SERVER_PATH)
        ? process.env.GYAZO_MCP_SERVER_PATH
        : null;
    }

    // Check if we're in a Docker environment
    const isDocker = this.isRunningInDocker();
    if (isDocker) {
      if (existsSync(DOCKER_WIN_MCP_SERVER_PATH)) {
        return DOCKER_WIN_MCP_SERVER_PATH;
      } else if (existsSync(DOCKER_MAC_MCP_SERVER_PATH)) {
        return DOCKER_MAC_MCP_SERVER_PATH;
      }
    } else {
      if (os === "win32") {
        return existsSync(WIN_GYAZO_MCP_SERVER_PATH)
          ? WIN_GYAZO_MCP_SERVER_PATH
          : null;
      } else if (os === "darwin") {
        return existsSync(MAC_GYAZO_MCP_SERVER_PATH)
          ? MAC_GYAZO_MCP_SERVER_PATH
          : null;
      }
    }

    return null;
  }

  // Check if running inside Docker container
  private isRunningInDocker(): boolean {
    try {
      // Check for .dockerenv file (standard Docker indicator)
      if (existsSync("/.dockerenv")) {
        return true;
      }

      // Check for Docker-specific cgroup entries
      if (existsSync("/proc/1/cgroup")) {
        const fs = require("fs");
        const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
        return cgroup.includes("docker") || cgroup.includes("containerd");
      }

      // Check environment variables
      if (process.env.DOCKER_CONTAINER || process.env.KUBERNETES_SERVICE_HOST) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Clean up resources when shutting down
  public cleanup(): void {
    if (this.childProcess) {
      this.childProcess.kill();
      this.childProcess = null;
    }
    this._isAvailable = false;
  }
}

// Exported functions for use in the MCP server

/**
 * Check if native capture tools are available
 */
export async function checkNativeCaptureAvailability(): Promise<boolean> {
  const server = GyazoNativeMCPServer.getInstance();

  if (!server.isAvailable) {
    try {
      return await server.initialize();
    } catch (error) {
      // stdioを汚染しないよう、標準出力にはログを出力しない
      return false;
    }
  }

  return true;
}

/**
 * List capturable windows
 */
export async function listCapturableWindows(limit: number = 30): Promise<any> {
  const server = GyazoNativeMCPServer.getInstance();

  if (!server.isAvailable) {
    throw new Error("Native capture server is not available");
  }

  return await server.sendRequest({
    method: "mcp.callTool",
    params: {
      name: "gyazo_list_capturable_windows",
      arguments: { limit },
    },
  });
}

/**
 * Capture and upload primary screen
 */
export async function captureAndUploadPrimaryScreen(): Promise<any> {
  const server = GyazoNativeMCPServer.getInstance();

  if (!server.isAvailable) {
    throw new Error("Native capture server is not available");
  }

  return await server.sendRequest({
    method: "mcp.callTool",
    params: {
      name: "gyazo_capture_and_upload_primary_screen",
      arguments: {},
    },
  });
}

/**
 * Capture and upload selected region
 */
export async function captureAndUploadRegion(): Promise<any> {
  const server = GyazoNativeMCPServer.getInstance();

  if (!server.isAvailable) {
    throw new Error("Native capture server is not available");
  }

  return await server.sendRequest({
    method: "mcp.callTool",
    params: {
      name: "gyazo_capture_and_upload_region",
      arguments: {},
    },
  });
}

/**
 * Capture and upload window
 */
export async function captureAndUploadWindow(
  windowHandle: string
): Promise<any> {
  const server = GyazoNativeMCPServer.getInstance();

  if (!server.isAvailable) {
    throw new Error("Native capture server is not available");
  }

  return await server.sendRequest({
    method: "mcp.callTool",
    params: {
      name: "gyazo_capture_and_upload_window",
      arguments: { windowHandle },
    },
  });
}
