# gyazo-mcp-server

A Model Context Protocol server for Gyazo image integration

This is a TypeScript-based MCP server that provides access to Gyazo images. It allows AI assistants to access and interact with Gyazo images through the Model Context Protocol, providing:

- Resources representing Gyazo images with URIs and metadata
- Tools for searching, fetching, and uploading images
- Image content and metadata access via the Gyazo API

## Features

### Resources

- List and access Gyazo images via `gyazo-mcp://` URIs
- Each image includes:
  - Original image content
  - Metadata (title, description, app, URL)
  - OCR data (if available)
- Supports various image formats (JPEG, PNG, etc.)

### Tools

- `gyazo_search` - Full-text search for captures uploaded by users on Gyazo

  - Search by keyword, title, app, URL, or date range
  - Supports pagination for browsing multiple results
  - Returns matching image URIs and metadata

- `gyazo_image` - Fetch image content and metadata from Gyazo

  - Retrieve specific images by ID or URL
  - Returns both image content and detailed metadata

- `gyazo_latest_image` - Fetch the most recent image from Gyazo

  - Returns both image content and metadata
  - Includes OCR text if available

- `gyazo_upload` - Upload an image to Gyazo
  - Upload images with base64 encoded image data
  - Add optional metadata like title, description, referer URL, and app name
  - Returns the uploaded image's permalink URL and ID

## Installation

### NPM Package

The easiest way to install the Gyazo MCP server is via npm:

```bash
npm install -g @notainc/gyazo-mcp-server
```

### Prerequisites

- Create a Gyazo account if you don't have one: https://gyazo.com
- Choose one of the following authentication methods:

#### Option A: Personal Access Token

1. Go to https://gyazo.com/api
2. Click "Register applications" > "New Application"
3. Fill in the form (Name and Callback URL are required; you can use `http://localhost` for the Callback URL)
4. Click "Submit", then click your application name to view details
5. Scroll down to "Your Access Token" and click "Generate"
6. Copy the access token value
7. Set the `GYAZO_ACCESS_TOKEN` environment variable with your token

#### Option B: OAuth Client Flow

OAuth authentication allows access to images shared within your Gyazo Teams organization, not just your own uploads.

1. Go to https://gyazo.com/oauth/applications and create a new application
2. Set the Callback URL to `http://localhost:18439/callback`
3. Note your `Client ID` and `Client Secret`
4. Run the authentication flow:

```bash
GYAZO_CLIENT_ID=your-client-id \
GYAZO_CLIENT_SECRET=your-client-secret \
npx @notainc/gyazo-mcp-server --auth
```

This opens your browser for authorization and saves the token to `~/.gyazo-mcp/token.json`. You only need to do this once.

### MCP Client Integration

To use with MCP clients (Claude Desktop, Claude Code, etc.), add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

#### Using NPM package with access token

```json
{
  "mcpServers": {
    "gyazo-mcp-server": {
      "command": "npx",
      "args": ["@notainc/gyazo-mcp-server"],
      "env": {
        "GYAZO_ACCESS_TOKEN": "your-access-token-here"
      }
    }
  }
}
```

#### Using NPM package with OAuth token

After running `--auth`, the stored token is used automatically:

```json
{
  "mcpServers": {
    "gyazo-mcp-server": {
      "command": "npx",
      "args": ["@notainc/gyazo-mcp-server"]
    }
  }
}
```

#### Using Docker with access token

```json
{
  "mcpServers": {
    "gyazo-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GYAZO_ACCESS_TOKEN",
        "gyazo-mcp-server"
      ],
      "env": {
        "GYAZO_ACCESS_TOKEN": "your-access-token-here"
      }
    }
  }
}
```

#### Using Docker with OAuth token

Mount the token file into the container:

```json
{
  "mcpServers": {
    "gyazo-mcp-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "~/.gyazo-mcp:/root/.gyazo-mcp",
        "gyazo-mcp-server"
      ]
    }
  }
}
```

## Development

Install dependencies:

```bash
npm ci
```

Build the server:

```bash
npm run build
```

For development with auto-rebuild:

```bash
npm run watch
```

### Docker Build (optional)

```bash
npm run image:build
```

---

<a href="https://glama.ai/mcp/servers/bhrk879agk">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/bhrk879agk/badge" />
</a>
