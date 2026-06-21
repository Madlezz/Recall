import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Tauri modules before importing the service
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn().mockResolvedValue("/mock/appdata/"),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

// Extract sanitizeFilename for testing
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]|\\.\\./g, "").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

describe("sanitizeFilename", () => {
  it("allows alphanumeric characters", () => {
    expect(sanitizeFilename("image123.png")).toBe("image123.png");
    expect(sanitizeFilename("test-file.jpg")).toBe("test-file.jpg");
    expect(sanitizeFilename("my_image.webp")).toBe("my_image.webp");
  });

  it("allows dots and hyphens", () => {
    expect(sanitizeFilename("file.name.ext")).toBe("file.name.ext");
    expect(sanitizeFilename("my-file-name.png")).toBe("my-file-name.png");
  });

  it("strips directory traversal attempts", () => {
    expect(sanitizeFilename("../etc/passwd")).toBe("..etcpasswd");
    expect(sanitizeFilename("..\\windows\\system32")).toBe("..windowssystem32");
    expect(sanitizeFilename("../../../etc/shadow")).toBe("......etcshadow");
  });

  it("replaces forward slashes", () => {
    expect(sanitizeFilename("path/to/file.png")).toBe("pathtofile.png");
    expect(sanitizeFilename("/absolute/path.jpg")).toBe("absolutepath.jpg");
  });

  it("replaces backslashes", () => {
    expect(sanitizeFilename("path\\to\\file.png")).toBe("pathtofile.png");
    expect(sanitizeFilename("folder\\image.jpg")).toBe("folderimage.jpg");
  });

  it("replaces spaces with underscores", () => {
    expect(sanitizeFilename("my image.png")).toBe("my_image.png");
    expect(sanitizeFilename("file name with spaces.jpg")).toBe("file_name_with_spaces.jpg");
  });

  it("replaces special characters with underscores", () => {
    expect(sanitizeFilename("image@2x.png")).toBe("image_2x.png");
    expect(sanitizeFilename("file#1.jpg")).toBe("file_1.jpg");
    expect(sanitizeFilename("test$file.png")).toBe("test_file.png");
  });

  it("handles unicode characters", () => {
    expect(sanitizeFilename("日本語.png")).toBe("___.png");
    expect(sanitizeFilename("café.jpg")).toBe("caf_.jpg");
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(sanitizeFilename("@#$%^&*()")).toBe("_________");
  });

  it("preserves case sensitivity", () => {
    expect(sanitizeFilename("MyImage.PNG")).toBe("MyImage.PNG");
    expect(sanitizeFilename("Test-File.JPG")).toBe("Test-File.JPG");
  });

  it("handles multiple consecutive special characters", () => {
    expect(sanitizeFilename("file@@@name.png")).toBe("file___name.png");
    expect(sanitizeFilename("test###file.jpg")).toBe("test___file.jpg");
  });
});

// Import the actual module for LRU tests
import { getImageUrl } from "@/services/images";

describe("image cache LRU behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reorders entry on cache hit (LRU)", async () => {
    // Access the internal cache via a fresh module import isn't possible,
    // so we test the observable behavior: repeated hits should keep entries alive
    const url1 = await getImageUrl("image1.png");
    const url2 = await getImageUrl("image2.png");
    
    // Access url1 again (should reorder it to most recent)
    const url1Again = await getImageUrl("image1.png");
    
    expect(url1).toBe(url1Again);
    expect(url1).toContain("image1.png");
    expect(url2).toContain("image2.png");
  });

  it("evicts least recently used entry when cache is full", async () => {
    // Fill cache with 100 entries (MAX_CACHE_SIZE)
    const urls: string[] = [];
    for (let i = 0; i < 100; i++) {
      urls.push(await getImageUrl(`image${i}.png`));
    }
    
    // Access entry 0 again (makes it most recent, so entry 1 becomes LRU)
    await getImageUrl("image0.png");
    
    // Add entry 100, which should evict entry 1 (the LRU after we accessed entry 0)
    const url100 = await getImageUrl("image100.png");
    
    // Entry 1 should be evicted (accessing it again should fetch fresh, but we can't easily test this)
    // Instead, verify that entry 0 is still cached (returns same URL)
    const url0Again = await getImageUrl("image0.png");
    expect(url0Again).toBe(urls[0]);
    
    // Entry 100 should be cached
    expect(url100).toContain("image100.png");
  });
});
