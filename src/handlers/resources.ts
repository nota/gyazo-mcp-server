/**
 * Resource related handlers
 */
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as api from "../api.js";
import { extractImageIdFromUri, getImageMetadataMarkdown } from "../utils.js";

/**
 * Handler for retrieving image resource list
 */
export const listResourcesHandler = {
  schema: ListResourcesRequestSchema,
  handler: async () => {
    try {
      const gyazoImages = await api.fetchImageList();

      return {
        resources: gyazoImages.map((gyazoImage) => ({
          uri: `gyazo-mcp:///${gyazoImage.image_id}`,
          mimeType: `image/${gyazoImage.type}`,
          name: gyazoImage.metadata.title || gyazoImage.image_id,
        })),
      };
    } catch (error) {
      console.error("Error listing resources:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to list resources: ${error.message}`);
      } else {
        throw new Error("Failed to list resources: Unknown error");
      }
    }
  },
};

/**
 * Handler for reading specific image resource
 */
export const readResourceHandler = {
  schema: ReadResourceRequestSchema,
  handler: async (request: any) => {
    try {
      const url = request.params.uri.toString();
      const id = extractImageIdFromUri(url);

      // Get image metadata
      const gyazoImage = await api.fetchImageMetadata(id);

      // Get image data
      const imageBase64 = await api.fetchImageAsBase64(gyazoImage.url);

      // Convert metadata to Markdown format
      const imageMetadataMarkdown = getImageMetadataMarkdown(gyazoImage);

      return {
        contents: [
          {
            uri: url,
            mimeType: `image/${gyazoImage.type}`,
            blob: imageBase64,
          },
          {
            uri: url,
            mimeType: "text/plain",
            text: imageMetadataMarkdown,
          },
        ],
      };
    } catch (error) {
      console.error("Error reading resource:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to read resource: ${error.message}`);
      } else {
        throw new Error("Failed to read resource: Unknown error");
      }
    }
  },
};
