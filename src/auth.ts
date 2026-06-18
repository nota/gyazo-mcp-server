/**
 * OAuth authentication flow for Gyazo API
 * Handles authorization code grant flow with local callback server
 */
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";

const GYAZO_AUTHORIZE_URL = "https://gyazo.com/oauth/authorize";
const GYAZO_TOKEN_URL = "https://gyazo.com/oauth/token";
const TOKEN_DIR = path.join(os.homedir(), ".gyazo-mcp");
const TOKEN_FILE = path.join(TOKEN_DIR, "token.json");
const CALLBACK_PORT = 18439;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

interface StoredToken {
  access_token: string;
}

/**
 * Load stored access token from file
 */
export function loadStoredToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      return data.access_token || null;
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Save access token to file
 */
function saveToken(token: StoredToken): void {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { mode: 0o700, recursive: true });
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), {
    mode: 0o600,
  });
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch(GYAZO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Start local HTTP server to receive OAuth callback
 * Returns a promise that resolves with the authorization code
 */
function waitForCallback(
  state: string,
): Promise<{ code: string; server: http.Server }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      if (!code || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>認証に失敗しました</h1><p>ウィンドウを閉じてください。</p>");
        reject(new Error("Invalid callback: missing code or state mismatch"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h1>認証が完了しました</h1><p>このウィンドウを閉じてください。</p>",
      );
      resolve({ code, server });
    });

    server.listen(CALLBACK_PORT, () => {
      // Server is ready
    });

    server.on("error", reject);
  });
}

/**
 * Open URL in the default browser
 */
async function openBrowser(url: string): Promise<void> {
  const { exec } = await import("node:child_process");
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${command} '${url}'`);
}

/**
 * Run the OAuth authorization flow
 * Opens browser for user authorization, receives callback, exchanges code for token
 */
export async function runOAuthFlow(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL(GYAZO_AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  const callbackPromise = waitForCallback(state);

  console.error(
    `Opening browser for Gyazo authorization...\n${authUrl.toString()}`,
  );
  await openBrowser(authUrl.toString());

  const { code, server } = await callbackPromise;
  server.close();

  const accessToken = await exchangeCodeForToken(code, clientId, clientSecret);
  saveToken({ access_token: accessToken });

  console.error("Gyazo OAuth authentication successful. Token saved.");
  return accessToken;
}
