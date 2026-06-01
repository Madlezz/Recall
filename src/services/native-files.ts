import { isTauriRuntime } from "@/db/client";
import type { RecallExportPayload } from "@/types";

export async function saveExportPayload(payload: RecallExportPayload): Promise<boolean> {
  const contents = JSON.stringify(payload, null, 2);
  const defaultName = `recall-export-${payload.exportedAt.slice(0, 10)}.json`;

  if (isTauriRuntime()) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) {
      return false;
    }

    await writeTextFile(path, contents);
    return true;
  }

  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = defaultName;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function openImportPayload(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const [{ open }, { readTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const path = await open({
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (typeof path !== "string") {
    return null;
  }

  return readTextFile(path);
}
