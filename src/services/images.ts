const MAX_CACHE_SIZE = 100;
const imageUrlCache = new Map<string, string>();

/** Reject path traversal and non-alphanumeric chars in image filenames */
function sanitizeFilename(name: string): string {
  // Strip directory traversal and dangerous chars
  return name.replace(/[/\\]|\.\./g, "").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

/** Open native file picker, copy selected image to app data dir, return filename. Browser-safe. */
export async function insertImage(): Promise<string | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
      multiple: false,
    });
    if (!selected) return null;

    const path = typeof selected === "string" ? selected : (selected as { path: string }).path;
    const { invoke } = await import("@tauri-apps/api/core");
    const filename: string = await invoke("copy_image_to_recall", { sourcePath: path });
    return sanitizeFilename(filename);
  } catch {
    return null;
  }
}

/** Resolve a recall image filename to a Tauri asset URL. Uses module-level LRU cache. */
export async function getImageUrl(filename: string): Promise<string> {
  const safe = sanitizeFilename(filename);
  if (!safe) return "";
  if (imageUrlCache.has(safe)) return imageUrlCache.get(safe)!;
  try {
    const { appDataDir } = await import("@tauri-apps/api/path");
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    const dir = await appDataDir();
    const src = convertFileSrc(`${dir}images/${safe}`);
    // LRU eviction: remove oldest entry if cache is full
    if (imageUrlCache.size >= MAX_CACHE_SIZE) {
      const firstKey = imageUrlCache.keys().next().value;
      if (firstKey) imageUrlCache.delete(firstKey);
    }
    imageUrlCache.set(safe, src);
    return src;
  } catch {
    return "";
  }
}