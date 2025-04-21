/**
 * Tool related handlers
 */
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as api from "../api.js";
import { getImageMetadataMarkdown } from "../utils.js";
import { createImageUri } from "../utils.js";

/**
 * Handler for listing available tools
 */
export const listToolsHandler = {
  schema: ListToolsRequestSchema,
  handler: async () => {
    return {
      tools: [
        {
          name: "gyazo_search",
          description:
            "Full-text search for captures uploaded by users on Gyazo",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Search keyword (max length: 200 characters). example: 'cat', 'title:cat', 'app:\"Google Chrome\"', 'url:google.com', 'cat since:2024-01-01 until:2024-12-31' NOTE: If you cannot find an appropriate capture, try rephrasing the search query to capture the user's intent and repeat the search several times",
              },
              page: {
                type: "integer",
                description: "Page number for pagination",
                minimum: 1,
                default: 1,
              },
              per: {
                type: "integer",
                description: "Number of results per page (max: 100)",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "gyazo_image",
          description: "Fetch image content and metadata from Gyazo",
          inputSchema: {
            type: "object",
            properties: {
              id_or_url: {
                type: "string",
                description: "ID or URL of the image on Gyazo",
              },
            },
            required: ["id_or_url"],
          },
        },
        {
          name: "gyazo_latest_image",
          description:
            "Fetch latest uploaded image content and metadata from Gyazo",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                const: "gyazo_latest_image",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "gyazo_upload",
          description: "Upload an image to Gyazo",
          inputSchema: {
            type: "object",
            properties: {
              imageData: {
                type: "string",
                description: "Base64 encoded image data",
              },
              title: {
                type: "string",
                description: "Title for the image (optional)",
              },
              description: {
                type: "string",
                description: "Description for the image (optional)",
              },
              refererUrl: {
                type: "string",
                description: "Source URL for the image (optional).",
              },
              app: {
                type: "string",
                description: "Application name for the image (optional).",
              },
            },
            required: ["imageData"],
          },
        },
      ],
    };
  },
};

/**
 * Handler for tool invocation
 */
export const callToolHandler = {
  schema: CallToolRequestSchema,
  handler: async (request: any) => {
    try {
      switch (request.params.name) {
        case "gyazo_search":
          return await handleGyazoSearch(request);
        case "gyazo_image":
          return await handleGyazoImage(request);
        case "gyazo_latest_image":
          return await handleGyazoLatestImage();
        case "gyazo_upload":
          return await handleGyazoUpload(request);
        default:
          throw new Error(`Tool ${request.params.name} not found`);
      }
    } catch (error) {
      console.error(`Error calling tool ${request.params.name}:`, error);
      if (error instanceof Error) {
        throw new Error(`Tool execution failed: ${error.message}`);
      } else {
        throw new Error("Tool execution failed: Unknown error");
      }
    }
  },
};

/**
 * Handler for gyazo_search tool
 */
async function handleGyazoSearch(request: any) {
  if (
    !request.params.arguments ||
    typeof request.params.arguments.query !== "string"
  ) {
    throw new Error(
      "Invalid search arguments: query is required and must be a string"
    );
  }

  const page =
    typeof request.params.arguments.page === "number"
      ? request.params.arguments.page
      : 1;
  const per =
    typeof request.params.arguments.per === "number"
      ? request.params.arguments.per
      : 20;

  const images = await api.searchImages(
    request.params.arguments.query,
    page,
    per
  );

  if (!images || images.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No images found",
        },
      ],
    };
  }

  const contents = images.map((image) => {
    return {
      uri: createImageUri(image.image_id),
      mimeType: `image/${image.type}`,
      permalink_url: image.permalink_url,
      url: image.url,
      thumb_url: image.thumb_url,
      created_at: image.created_at,
      alt_text: image.alt_text,
    };
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(contents, null, 2),
      },
    ],
  };
}

/**
 * Handler for gyazo_image tool
 */
async function handleGyazoImage(request: any) {
  if (
    !request.params.arguments ||
    typeof request.params.arguments.id_or_url !== "string"
  ) {
    throw new Error(
      "Invalid image arguments: id_or_url is required and must be a string"
    );
  }

  const imageIdOrUrl = request.params.arguments.id_or_url;
  const imageId = imageIdOrUrl.startsWith("http")
    ? imageIdOrUrl.split("/").pop()
    : imageIdOrUrl;

  const gyazoImage = await api.fetchImageMetadata(imageId);
  if (!gyazoImage) {
    throw new Error("Image not found");
  }
  const imageBase64 = await api.fetchImageAsBase64(gyazoImage.url);
  const imageMetadataMarkdown = getImageMetadataMarkdown(gyazoImage);

  return {
    content: [
      {
        type: "image",
        data: imageBase64,
        mimeType: `image/${gyazoImage.type}`,
      },
      {
        type: "text",
        text: imageMetadataMarkdown,
      },
    ],
  };
}

/**
 * Handler for gyazo_latest_image tool
 */
async function handleGyazoLatestImage() {
  const images = await api.fetchImageList(1, 1);

  if (!images || images.length === 0) {
    throw new Error("No images found");
  }

  const image = images[0];
  const imageBase64 = await api.fetchImageAsBase64(image.url);

  return {
    content: [
      {
        type: "image",
        data: imageBase64,
        mimeType: `image/${image.type}`,
      },
      {
        type: "text",
        text: getImageMetadataMarkdown(image),
      },
    ],
  };
}

/**
 * Handler for gyazo_upload tool
 */
async function handleGyazoUpload(request: any) {
  if (
    !request.params.arguments ||
    typeof request.params.arguments.imageData !== "string"
  ) {
    throw new Error(
      "Invalid upload arguments: imageData is required and must be a string"
    );
  }

  const { imageData, title, description, refererUrl, app } =
    request.params.arguments;

  const result = await api.uploadImage(imageData, {
    title,
    description,
    refererUrl,
    app,
  });

  return {
    content: [
      {
        type: "text",
        text: `Image successfully uploaded to Gyazo!\n\nPermalink URL: ${result.permalink_url}\nImage URL: ${result.url}\nImage ID: ${result.image_id}`,
      },
    ],
  };
}
