const imageUrlCache = new Map<string, string>();

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
    return filename;
  } catch {
    return null;
  }
}

/** Resolve a recall image filename to a Tauri asset URL. Uses module-level cache. */
export async function getImageUrl(filename: string): Promise<string> {
  if (imageUrlCache.has(filename)) return imageUrlCache.get(filename)!;
  try {
    const { appDataDir } = await import("@tauri-apps/api/path");
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    const dir = await appDataDir();
    const src = convertFileSrc(`${dir}images/${filename}`);
    imageUrlCache.set(filename, src);
    return src;
  } catch {
    return "";
  }
}