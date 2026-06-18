import { describe, it, expect } from "vitest";

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
