/**
 * Module for interfacing with native Gyazo MCPServer (Windows/macOS)
 */
import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";
import { join } from "path";

// Path constants
const WIN_GYAZO_MCP_SERVER_PATH =
  "C:\\Program Files (x86)\\Gyazo\\GyazoWinMCPServer.exe";
const MAC_GYAZO_MCP_SERVER_PATH =
  "/Applications/Gyazo Menu.app/Contents/Helpers/cli-tool/GyazoMacMCPServer";

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
    const serverPath = this.getServerPath();

    if (!serverPath) {
      this._isAvailable = false;
      return false;
    }

    try {
      // Start the child process
      this.childProcess = spawn(serverPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Set up event listeners
      this.childProcess.stdout?.on("data", (data: Buffer) => {
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
            this.buffers = [];
            this.handleResponse(completeMessage);
          } else {
            this.handleResponse(message);
          }
        }
      });

      this.childProcess.stderr?.on("data", (data: Buffer) => {
        // stdioを汚染しないよう、標準出力にはログを出力しない
      });

      this.childProcess.on("close", (code: number) => {
        // stdioを汚染しないよう、標準出力にはログを出力しない
        this.childProcess = null;
        this._isAvailable = false;
      });

      // Ping the server to ensure it's working
      await this.sendRequest({
        method: "mcp.listTools",
        params: {},
      });

      this._isAvailable = true;
      return true;
    } catch (error) {
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
      const response = JSON.parse(data);
      const id = response.id as string;
      const pendingRequest = this.pendingRequests.get(id);

      if (pendingRequest) {
        if (response.error) {
          pendingRequest.reject(new Error(response.error.message));
        } else {
          pendingRequest.resolve(response.result);
        }
        this.pendingRequests.delete(id);
      }
    } catch (error) {
      // stdioを汚染しないよう、標準出力にはログを出力しない
    }
  }

  // Get the path to the native MCP server based on OS
  private getServerPath(): string | null {
    const os = platform();

    if (os === "win32") {
      return existsSync(WIN_GYAZO_MCP_SERVER_PATH)
        ? WIN_GYAZO_MCP_SERVER_PATH
        : null;
    } else if (os === "darwin") {
      return existsSync(MAC_GYAZO_MCP_SERVER_PATH)
        ? MAC_GYAZO_MCP_SERVER_PATH
        : null;
    }

    return null;
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
      name: "list_capturable_windows",
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
      name: "capture_and_upload_primary_screen",
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
      name: "capture_and_upload_region",
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
      name: "capture_and_upload_window",
      arguments: { windowHandle },
    },
  });
}
