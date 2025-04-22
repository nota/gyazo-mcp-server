# gyazo-mcp-server

A Model Context Protocol server for Gyazo image integration

This is a TypeScript-based MCP server that provides access to Gyazo images. It allows AI assistants to access and interact with Gyazo images through the Model Context Protocol, providing:

- Resources representing Gyazo images with URIs and metadata
- Tools for fetching the latest image
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

- `gyazo_latest_image` - Fetch the most recent image from Gyazo
  - Returns both image content and metadata
  - Includes OCR text if available

## Installation

### NPM Package

The easiest way to install the Gyazo MCP server is via npm:

```bash
npm install -g @notainc/gyazo-mcp-server
```

### Prerequisites

- Create a Gyazo account if you don't have one: https://gyazo.com
- Get your Gyazo API access token from: https://gyazo.com/api
  - Click "Register applications" button
  - Click "New Application" button
  - Fill in the form with your app name and description
    - Name and Callback URL are required
    - You can use `http://localhost` for the Callback URL
  - Click "Submit" button
  - Click application name to view details
  - Scroll down to "Your Access Token"
  - Click "Generate" button
  - Copy "Your access token" value
- Set the `GYAZO_ACCESS_TOKEN` environment variable with your token

### Claude Desktop Integration

To use with Claude Desktop, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

#### Using NPM package (recommended)

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

#### Using Docker (optional)

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
