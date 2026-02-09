/**
 * Module for handling communication with the Gyazo API
 */
import { API_ENDPOINTS, getAccessToken } from "./config.js";
import {
  GyazoImage,
  SearchedGyazoImage,
  GyazoUploadResponse,
} from "./types.js";
import { compressImageIfNeeded } from "./utils.js";

/**
 * Fetch image list from Gyazo API
 */
export async function fetchImageList(
  page = 1,
  perPage = 10,
): Promise<GyazoImage[]> {
  const params = new URLSearchParams();
  params.append("access_token", getAccessToken());
  params.append("page", page.toString());
  params.append("per_page", perPage.toString());

  const url = `${API_ENDPOINTS.IMAGES}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch images: ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch metadata for a specific Gyazo image
 */
export async function fetchImageMetadata(imageId: string): Promise<GyazoImage> {
  const params = new URLSearchParams();
  params.append("access_token", getAccessToken());

  const url = `${API_ENDPOINTS.IMAGE(imageId)}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image metadata: ${response.status}`);
  }

  const data = await response.json();
  if (!data) {
    throw new Error(`Image ${imageId} not found`);
  }

  return data;
}

/**
 * Fetch image data as Base64 from image URL
 * @returns Object containing Base64 encoded image data and MIME type
 */
export async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(imageUrl);
  const contentType = response.headers.get("content-type") || "image/png";
  const imageBlob = await response.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  const base64Data = Buffer.from(imageBuffer).toString("base64");

  // 最大サイズは0.75MBに設定
  const maxSizeBytes = 0.75 * 1024 * 1024;

  // データサイズをチェック
  if (Buffer.from(base64Data, "base64").length > maxSizeBytes) {
    // データサイズが制限を超えていたら圧縮する
    // 先頭でインポート済みのcompressImageIfNeeded関数を使用
    const compressedResult = await compressImageIfNeeded(
      base64Data,
      maxSizeBytes,
    );

    // 圧縮した場合は圧縮結果のデータとMIMEタイプを返す
    // 圧縮結果のMIMEタイプは必ず'image/jpeg'
    return compressedResult;
  }

  return {
    data: `data:${contentType};base64,${base64Data}`,
    mimeType: contentType,
  };
}

/**
 * Search for images using the Gyazo API
 */
export async function searchImages(
  query: string,
  page = 1,
  per = 20,
): Promise<SearchedGyazoImage[]> {
  const params = new URLSearchParams();
  params.append("access_token", getAccessToken());
  params.append("query", query);
  params.append("page", page.toString());
  params.append("per", per.toString());

  const url = `${API_ENDPOINTS.SEARCH}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Search failed with status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Upload an image to the Gyazo API
 */
export async function uploadImage(
  imageData: string,
  options?: {
    title?: string;
    description?: string;
    refererUrl?: string;
    app?: string;
  },
): Promise<GyazoUploadResponse> {
  // Remove prefix from Base64 data
  const base64Image = imageData.replace(/^data:image\/(\w+);base64,/, "");

  // Get image format from prefix
  let imageType = "png"; // Default value
  const typeMatch = imageData.match(/^data:image\/(\w+);base64,/);
  if (typeMatch && typeMatch[1]) {
    imageType = typeMatch[1];
  }

  // Convert to binary data
  const imageBuffer = Buffer.from(base64Image, "base64");

  // Create FormData object
  const formData = new FormData();

  // Create File object with specified filename
  const fileName = `screenshot_${Date.now()}.${imageType}`;
  const file = new File([imageBuffer], fileName, {
    type: `image/${imageType}`,
  });

  // Add imagedata with filename
  formData.append("imagedata", file);

  // Add optional parameters
  if (options?.title) {
    formData.append("title", String(options.title));
  }
  if (options?.description) {
    formData.append("desc", String(options.description));
  }
  if (options?.refererUrl) {
    formData.append("referer_url", String(options.refererUrl));
  }
  if (options?.app) {
    formData.append("app", String(options.app));
  }

  // Add access token
  formData.append("access_token", getAccessToken());

  // Send upload request
  const response = await fetch(API_ENDPOINTS.UPLOAD, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }

  return await response.json();
}
