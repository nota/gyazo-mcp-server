/**
 * Utility functions
 */
import sharp from "sharp";
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
    imageMetadataMarkdown += `### OCR Locale:\n${gyazoImage.ocr.locale}\n\n`;
  }
  if (gyazoImage.exif_normalized) {
    imageMetadataMarkdown += `### EXIF Location:\n`;
    imageMetadataMarkdown += `Latitude: ${gyazoImage.exif_normalized.latitude}\n`;
    imageMetadataMarkdown += `Longitude: ${gyazoImage.exif_normalized.longitude}\n\n`;
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

/**
 * Compress image if its Base64 size exceeds the maximum allowed size
 * @param base64Data Base64 encoded image data
 * @param maxSizeBytes Maximum allowed size in bytes
 * @returns Object containing compressed Base64 data and the mime type
 */
export async function compressImageIfNeeded(
  base64Data: string,
  maxSizeBytes: number = 0.75 * 1024 * 1024 // 0.75MB default
): Promise<{ data: string; mimeType: string }> {
  // データサイズをチェック
  let imageBuffer: Buffer;
  let originalMimeType = "image/png"; // デフォルト値

  // Base64データの形式を確認
  if (base64Data.startsWith("data:")) {
    // data:URLからMIMEタイプを抽出
    const matches = base64Data.match(/^data:([^;]+);base64,(.*)$/);
    if (matches && matches.length >= 3) {
      originalMimeType = matches[1];
      imageBuffer = Buffer.from(matches[2], "base64");
    } else {
      throw new Error("Invalid data URL format");
    }
  } else {
    // 純粋なBase64文字列
    imageBuffer = Buffer.from(base64Data, "base64");
  }

  // サイズをチェック
  if (imageBuffer.length <= maxSizeBytes) {
    // サイズが制限内なら元のデータを返す
    return {
      data: imageBuffer.toString("base64"),
      mimeType: originalMimeType,
    };
  }

  // 初期の圧縮品質
  let quality = 90;
  let compressedBuffer: Buffer;

  // 画像サイズが目標サイズ以下になるまで圧縮品質を下げる
  do {
    // Sharpを使ってJPEG形式に変換し圧縮
    compressedBuffer = await sharp(imageBuffer).jpeg({ quality }).toBuffer();

    // 圧縮品質を下げる
    quality -= 10;

    // 最低品質の設定
    if (quality < 10) {
      quality = 10;
      // 最後の試行
      compressedBuffer = await sharp(imageBuffer).jpeg({ quality }).toBuffer();
      break;
    }
  } while (compressedBuffer.length > maxSizeBytes);

  // Base64に変換
  const compressedBase64 = `${compressedBuffer.toString("base64")}`;

  return {
    data: compressedBase64,
    mimeType: "image/jpeg",
  };
}
