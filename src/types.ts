/**
 * Type definitions
 */

/**
 * Type definition for Gyazo image
 */
export type GyazoImage = {
  image_id: string;
  permalink_url: string;
  thumb_url: string;
  url: string;
  type: string;
  created_at: string;
  metadata: {
    app: string;
    title: string;
    url: string;
    desc: string;
  };
  ocr?: {
    locale: string;
    description: string;
  };
  exif_normalized?: {
    latitude: number;
    longitude: number;
  };
};

/**
 * Type definition for search API response
 */
export type SearchedGyazoImage = {
  image_id: string;
  permalink_url: string;
  url: string;
  access_policy: string | null;
  type: string;
  thumb_url: string;
  created_at: string;
  alt_text: string;
};

/**
 * Type definition for upload API response
 */
export type GyazoUploadResponse = {
  image_id: string;
  permalink_url: string;
  url: string;
  thumb_url?: string;
};

/**
 * Type definition for capturable window
 */
export type CapturableWindow = {
  handle: string;
  title: string;
  processName: string;
  isVisible: boolean;
  zOrder: number;
};

/**
 * Type definition for capture and upload response
 */
export type CaptureUploadResponse = {
  image_id: string;
  permalink_url: string;
  url: string;
  data: string; // Base64 image data
  mimeType: string;
};
