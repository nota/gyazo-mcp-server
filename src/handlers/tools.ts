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
import {
  checkNativeCaptureAvailability,
  listCapturableWindows,
  captureAndUploadPrimaryScreen,
  captureAndUploadRegion,
  captureAndUploadWindow,
} from "../capture-proxy.js";

/**
 * Handler for listing available tools
 */
export const listToolsHandler = {
  schema: ListToolsRequestSchema,
  handler: async () => {
    // Standard tools available in all platforms
    const standardTools = [
      {
        name: "gyazo_search",
        description: "Full-text search for captures uploaded by users on Gyazo",
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
    ];

    const captureTools = [
      {
        name: "gyazo_capture_and_upload_region",
        description:
          "Initiates a UI for region selection. Captures the selected screen area, uploads it to Gyazo, and returns the Gyazo image URL and image data.",
        inputSchema: {
          type: "object",
          properties: {},
          title: "capture_and_upload_region",
        },
      },
      {
        name: "gyazo_capture_and_upload_primary_screen",
        description:
          "Captures the entire primary screen, uploads it to Gyazo, and returns both the Gyazo image URL and image data.",
        inputSchema: {
          type: "object",
          properties: {},
          title: "capture_and_upload_primary_screen",
        },
      },
      {
        name: "gyazo_capture_and_upload_window",
        description:
          "Captures the specified window, uploads it to Gyazo, and returns both the Gyazo image URL and image data.",
        inputSchema: {
          type: "object",
          properties: {
            windowHandle: {
              type: "string",
              description:
                "Hexadecimal string of the window handle to capture. Use the value obtained from calling list_capturable_windows.",
            },
          },
          required: ["windowHandle"],
          title: "capture_and_upload_window",
        },
      },
      {
        name: "gyazo_list_capturable_windows",
        description: "Returns a list of windows available for screen capture.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              description:
                "Maximum number of windows to retrieve. (Default value: 30)",
            },
          },
          required: ["limit"],
          title: "list_capturable_windows",
        },
      },
    ];

    return {
      tools: [...standardTools, ...captureTools],
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
        case "gyazo_list_capturable_windows":
          return await handleListCapturableWindows(request);
        case "gyazo_capture_and_upload_primary_screen":
          return await handleCaptureAndUploadPrimaryScreen();
        case "gyazo_capture_and_upload_region":
          return await handleCaptureAndUploadRegion();
        case "gyazo_capture_and_upload_window":
          return await handleCaptureAndUploadWindow(request);
        default:
          throw new Error(`Tool ${request.params.name} not found`);
      }
    } catch (error) {
      // stdioを汚染しないため、エラーをそのままスローする
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
  const { data: imageBase64, mimeType } = await api.fetchImageAsBase64(
    gyazoImage.url
  );
  const imageMetadataMarkdown = getImageMetadataMarkdown(gyazoImage);

  return {
    content: [
      {
        type: "text",
        text: imageMetadataMarkdown,
      },
      {
        type: "image",
        data: imageBase64,
        mimeType: mimeType,
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
  const { data: imageBase64, mimeType } = await api.fetchImageAsBase64(
    image.url
  );

  return {
    content: [
      {
        type: "image",
        data: imageBase64,
        mimeType: mimeType,
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

/**
 * Handler for gyazo_list_capturable_windows tool
 */
async function handleListCapturableWindows(request: any) {
  // Check native capture availability
  if (!(await checkNativeCaptureAvailability())) {
    throw new Error("Native capture functionality is not available");
  }

  // Extract limit parameter or use default
  const limit =
    request.params.arguments &&
    typeof request.params.arguments.limit === "number"
      ? request.params.arguments.limit
      : 30;

  // Get windows list from native MCP server
  const result = await listCapturableWindows(limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Handler for gyazo_capture_and_upload_primary_screen tool
 */
async function handleCaptureAndUploadPrimaryScreen() {
  // Check native capture availability
  if (!(await checkNativeCaptureAvailability())) {
    throw new Error("Native capture functionality is not available");
  }

  // Capture screen and get result from native MCP server
  const result = await captureAndUploadPrimaryScreen();

  return {
    content: [
      {
        type: "text",
        text: `Screen successfully captured and uploaded to Gyazo!\n\nPermalink URL: ${result.permalink_url}\nImage URL: ${result.url}`,
      },
      {
        type: "image",
        data: result.data,
        mimeType: result.mimeType,
      },
    ],
  };
}

/**
 * Handler for gyazo_capture_and_upload_region tool
 */
async function handleCaptureAndUploadRegion() {
  // Check native capture availability
  if (!(await checkNativeCaptureAvailability())) {
    throw new Error("Native capture functionality is not available");
  }

  try {
    // Capture region and get result from native MCP server
    const result = await captureAndUploadRegion();

    return {
      content: [
        {
          type: "text",
          text: `Region successfully captured and uploaded to Gyazo!\n\nPermalink URL: ${result.permalink_url}\nImage URL: ${result.url}`,
        },
        {
          type: "image",
          data: result.data,
          mimeType: result.mimeType,
        },
      ],
    };
  } catch (error) {
    // 領域選択がキャンセルされた場合などの特別なエラーハンドリング
    return {
      content: [
        {
          type: "text",
          text: "Could not capture the region. This may have happened because no region was selected.",
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for gyazo_capture_and_upload_window tool
 */
async function handleCaptureAndUploadWindow(request: any) {
  // Check native capture availability
  if (!(await checkNativeCaptureAvailability())) {
    throw new Error("Native capture functionality is not available");
  }

  // Validate window handle parameter
  if (
    !request.params.arguments ||
    typeof request.params.arguments.windowHandle !== "string"
  ) {
    throw new Error(
      "Invalid arguments: windowHandle is required and must be a string"
    );
  }

  // Capture window and get result from native MCP server
  const result = await captureAndUploadWindow(
    request.params.arguments.windowHandle
  );

  return {
    content: [
      {
        type: "text",
        text: `Window successfully captured and uploaded to Gyazo!\n\nPermalink URL: ${result.permalink_url}\nImage URL: ${result.url}`,
      },
      {
        type: "image",
        data: result.data,
        mimeType: result.mimeType,
      },
    ],
  };
}
