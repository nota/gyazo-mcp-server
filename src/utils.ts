/**
 * Utility functions
 */
import { GyazoImage } from "./types.js";

/**
 * Get Gyazo image metadata in Markdown format
 */
export function getImageMetadataMarkdown(gyazoImage: GyazoImage): string {
  let imageMetadataMarkdown = "";
  if (gyazoImage.metadata.title) {
    imageMetadataMarkdown += `### Title:\n${gyazoImage.metadata.title}\n\n`;
  }
  if (gyazoImage.metadata.desc) {
    imageMetadataMarkdown += `### Description:\n${gyazoImage.metadata.desc}\n\n`;
  }
  if (gyazoImage.metadata.app) {
    imageMetadataMarkdown += `### App:\n${gyazoImage.metadata.app}\n\n`;
  }
  if (gyazoImage.metadata.url) {
    imageMetadataMarkdown += `### URL:\n${gyazoImage.metadata.url}\n\n`;
  }
  if (gyazoImage.ocr?.description) {
    imageMetadataMarkdown += `### OCR:\n${gyazoImage.ocr.description}\n\n`;
  }
  if (gyazoImage.ocr?.locale) {
    imageMetadataMarkdown += `### Locale:\n${gyazoImage.ocr.locale}\n\n`;
  }
  return imageMetadataMarkdown;
}

/**
 * Extract Gyazo image ID from URI
 */
export function extractImageIdFromUri(uri: string): string {
  return uri.replace("gyazo-mcp:///", "");
}

/**
 * Create URI from Gyazo image ID
 */
export function createImageUri(imageId: string): string {
  return `gyazo-mcp:///${imageId}`;
}
