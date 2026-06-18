import { describe, it, expect } from "vitest";

const PAGE_SIZE = 50;

// Extract pagination logic for testing
function getPaginationInfo(filteredCount: number, page: number) {
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * PAGE_SIZE;
  const endIndex = Math.min((currentPage + 1) * PAGE_SIZE, filteredCount);
  const showing = filteredCount > 0 ? `Showing ${startIndex + 1} to ${endIndex} of ${filteredCount} cards` : "";
  return { totalPages, currentPage, startIndex, endIndex, showing };
}

describe("Card browser pagination", () => {
  it("calculates single page for small datasets", () => {
    const result = getPaginationInfo(10, 0);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(0);
    expect(result.showing).toBe("Showing 1 to 10 of 10 cards");
  });

  it("calculates multiple pages correctly", () => {
    const result = getPaginationInfo(150, 0);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(0);
    expect(result.showing).toBe("Showing 1 to 50 of 150 cards");
  });

  it("handles second page correctly", () => {
    const result = getPaginationInfo(150, 1);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.showing).toBe("Showing 51 to 100 of 150 cards");
  });

  it("handles last page correctly", () => {
    const result = getPaginationInfo(150, 2);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(2);
    expect(result.showing).toBe("Showing 101 to 150 of 150 cards");
  });

  it("clamps page to valid range when too high", () => {
    const result = getPaginationInfo(150, 10);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(2); // Clamped to last page
  });

  it("handles empty dataset", () => {
    const result = getPaginationInfo(0, 0);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(0);
    expect(result.showing).toBe("");
  });

  it("handles exact page boundary", () => {
    const result = getPaginationInfo(100, 1);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(1);
    expect(result.showing).toBe("Showing 51 to 100 of 100 cards");
  });

  it("handles dataset with 1 card", () => {
    const result = getPaginationInfo(1, 0);
    expect(result.totalPages).toBe(1);
    expect(result.showing).toBe("Showing 1 to 1 of 1 cards");
  });

  it("handles exactly PAGE_SIZE cards", () => {
    const result = getPaginationInfo(50, 0);
    expect(result.totalPages).toBe(1);
    expect(result.showing).toBe("Showing 1 to 50 of 50 cards");
  });

  it("handles PAGE_SIZE + 1 cards", () => {
    const result = getPaginationInfo(51, 0);
    expect(result.totalPages).toBe(2);
    expect(result.showing).toBe("Showing 1 to 50 of 51 cards");
  });
});
