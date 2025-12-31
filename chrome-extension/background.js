// OBS-Suite Chrome Extension - Background Service Worker
// Handles context menu creation, image download, and API communication

/**
 * Default server URL - matches APP_PORT in lib/config/urls.ts
 * User can override this in extension options (stored in chrome.storage.sync)
 */
const DEFAULT_SERVER_URL = "http://localhost:3000";

// Context menu IDs
const MENU_PARENT_ID = "obs-suite-parent";
const MENU_LEFT_ID = "obs-suite-left";
const MENU_RIGHT_ID = "obs-suite-right";

// Create context menus on extension install
chrome.runtime.onInstalled.addListener(() => {
  // Create parent menu
  chrome.contextMenus.create({
    id: MENU_PARENT_ID,
    title: "OBS-Suite",
    contexts: ["image"],
  });

  // Create child menu items
  chrome.contextMenus.create({
    id: MENU_LEFT_ID,
    parentId: MENU_PARENT_ID,
    title: "Show as Left Poster",
    contexts: ["image"],
  });

  chrome.contextMenus.create({
    id: MENU_RIGHT_ID,
    parentId: MENU_PARENT_ID,
    title: "Show as Right Poster",
    contexts: ["image"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_LEFT_ID) {
    handlePosterAction(info, "left");
  } else if (info.menuItemId === MENU_RIGHT_ID) {
    handlePosterAction(info, "right");
  }
});

/**
 * Main workflow: Download image, upload to server, create poster, trigger display
 */
async function handlePosterAction(info, side) {
  try {
    // Get server URL from settings
    const serverUrl = await getServerUrl();
    const imageUrl = info.srcUrl;

    if (!imageUrl) {
      showNotification("Error: No image URL found", "error");
      return;
    }

    showNotification("Processing image...", "info");

    // Step 1: Check if poster already exists for this URL
    const existingPoster = await findPosterBySourceUrl(serverUrl, imageUrl);

    if (existingPoster) {
      // Step 2: Just trigger display of existing poster
      await showPoster(serverUrl, existingPoster.id, side, existingPoster.fileUrl);
      showNotification(
        `Showing existing poster "${existingPoster.title}" on ${side} side`,
        "success"
      );
      return;
    }

    // Step 3: Download image from webpage
    const imageBlob = await downloadImage(imageUrl);

    // Step 4: Upload to OBS Live Suite
    const uploadResult = await uploadImage(serverUrl, imageBlob, imageUrl);

    // Step 5: Create poster with "from-web" tag and source URL in metadata
    const posterResult = await createPoster(
      serverUrl,
      uploadResult.url,
      uploadResult.type,
      generateTitle(imageUrl),
      imageUrl
    );

    // Step 6: Trigger poster display
    await showPoster(serverUrl, posterResult.poster.id, side, posterResult.poster.fileUrl);

    showNotification(
      `Poster "${posterResult.poster.title}" shown on ${side} side`,
      "success"
    );
  } catch (error) {
    console.error("OBS-Suite error:", error);
    showNotification(`Error: ${error.message}`, "error");
  }
}

/**
 * Download image from URL (bypasses CORS via extension permissions)
 */
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    // Get MIME type from Content-Type header
    const contentType = response.headers.get("content-type");
    const blob = await response.blob();

    // If blob doesn't have correct type, create new blob with correct type
    if (contentType && blob.type !== contentType) {
      return new Blob([blob], { type: contentType });
    }

    return blob;
  } catch (error) {
    throw new Error(`Image download failed: ${error.message}`);
  }
}

/**
 * Upload image to OBS Live Suite backend
 */
async function uploadImage(serverUrl, blob, originalUrl) {
  try {
    // Ensure blob has a valid MIME type
    const mimeType = blob.type || detectMimeTypeFromUrl(originalUrl);

    // Generate filename from URL or use timestamp
    const filename = generateFilename(originalUrl, mimeType);

    const file = new File([blob], filename, { type: mimeType });

    // Create FormData for upload
    const formData = new FormData();
    formData.append("file", file);

    // Upload to server
    const response = await fetch(`${serverUrl}/api/assets/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || "Upload failed");
      } catch {
        throw new Error(`Upload failed: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Find existing poster by source URL
 */
async function findPosterBySourceUrl(serverUrl, sourceUrl) {
  try {
    const response = await fetch(`${serverUrl}/api/assets/posters`);
    if (!response.ok) return null;

    const data = await response.json();
    const posters = data.posters || [];

    // Find poster with matching source URL in metadata
    return posters.find(
      (poster) => poster.metadata?.sourceUrl === sourceUrl
    );
  } catch (error) {
    return null;
  }
}

/**
 * Create poster in OBS Live Suite with "from-web" tag
 */
async function createPoster(serverUrl, fileUrl, type, title, sourceUrl) {
  try {
    const response = await fetch(`${serverUrl}/api/assets/posters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        fileUrl,
        type,
        tags: ["from-web"],
        metadata: {
          sourceUrl,
          addedAt: new Date().toISOString(),
          addedBy: "chrome-extension",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create poster");
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Create poster failed: ${error.message}`);
  }
}

/**
 * Trigger poster display on overlay
 */
async function showPoster(serverUrl, posterId, side, fileUrl) {
  try {
    const response = await fetch(`${serverUrl}/api/overlays/poster`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "show",
        payload: {
          posterId,
          fileUrl,
          side,
          transition: "fade",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || "Failed to show poster");
      } catch {
        throw new Error(`Failed to show poster: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Show poster failed: ${error.message}`);
  }
}

/**
 * Get server URL from chrome.storage (with default fallback)
 */
async function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["serverUrl"], (result) => {
      resolve(result.serverUrl || DEFAULT_SERVER_URL);
    });
  });
}

/**
 * Show notification to user
 */
function showNotification(message, type = "info") {
  const iconMap = {
    success: "icons/icon48.png",
    error: "icons/icon48.png",
    info: "icons/icon48.png",
  };

  chrome.notifications.create({
    type: "basic",
    iconUrl: iconMap[type] || iconMap.info,
    title: "OBS-Suite",
    message,
    priority: type === "error" ? 2 : 1,
  });
}

/**
 * Generate title from image URL
 */
function generateTitle(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf("/") + 1);

    // Remove extension and decode URI
    const name = decodeURIComponent(filename.replace(/\.[^/.]+$/, ""));

    // Clean up: replace special characters with spaces, limit length
    return name
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 100) || "Image from web";
  } catch (error) {
    return "Image from web";
  }
}

/**
 * Detect MIME type from URL extension
 */
function detectMimeTypeFromUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname.toLowerCase();

    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      return "image/jpeg";
    } else if (pathname.endsWith(".png")) {
      return "image/png";
    } else if (pathname.endsWith(".gif")) {
      return "image/gif";
    } else if (pathname.endsWith(".webp")) {
      return "image/webp";
    } else if (pathname.endsWith(".mp4")) {
      return "video/mp4";
    } else if (pathname.endsWith(".webm")) {
      return "video/webm";
    } else if (pathname.endsWith(".mov")) {
      return "video/quicktime";
    }

    // Default to JPEG
    return "image/jpeg";
  } catch (error) {
    return "image/jpeg";
  }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType) {
  const mimeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return mimeMap[mimeType] || "jpg";
}

/**
 * Generate filename from URL
 */
function generateFilename(imageUrl, mimeType) {
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const filename = pathname.substring(pathname.lastIndexOf("/") + 1);

    // If filename has extension, use it
    if (filename && filename.includes(".")) {
      return filename;
    }

    // Fallback: generate filename with timestamp and proper extension
    const timestamp = Date.now();
    const ext = getExtensionFromMimeType(mimeType);
    return `image-${timestamp}.${ext}`;
  } catch (error) {
    const timestamp = Date.now();
    const ext = getExtensionFromMimeType(mimeType);
    return `image-${timestamp}.${ext}`;
  }
}
