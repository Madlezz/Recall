import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../error-boundary";

function Boom(): JSX.Element {
  throw new Error("boom test error");
}

function Ok(): JSX.Element {
  return <div>all good</div>;
}

describe("ErrorBoundary", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const reload = vi.fn();

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(window.location, "reload").mockImplementation(reload);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    writeText.mockClear();
    reload.mockClear();
  });

  it("renders fallback UI with heading when a child throws", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    // Heading may be rendered async (i18n), wait for it
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toBeTruthy();
    expect(screen.getByText(/boom test error/)).toBeTruthy();
  });

  it("renders children normally when no error", () => {
    render(
      <ErrorBoundary>
        <Ok />
      </ErrorBoundary>
    );
    expect(screen.getByText("all good")).toBeTruthy();
  });

  it("copies error details to clipboard on copy click", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    const copyBtns = await screen.findAllByRole("button", { name: /copy error/i });
    fireEvent.click(copyBtns[0]);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("boom test error"));
  });

  it("shows recovery button when onRecover provided and invokes it", async () => {
    const onRecover = vi.fn();
    render(
      <ErrorBoundary onRecover={onRecover}>
        <Boom />
      </ErrorBoundary>
    );
    fireEvent.click(await screen.findByRole("button", { name: /back to dashboard/i }));
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it("shows refresh button when no onRecover and reloads the page", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    fireEvent.click(await screen.findByRole("button", { name: /refresh/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("uses custom fallback node when provided", async () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(await screen.findByText("custom fallback")).toBeTruthy();
  });
});
