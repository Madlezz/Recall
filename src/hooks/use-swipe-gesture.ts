import { useRef, useState, useEffect, useCallback } from "react";

export type SwipeDirection = "left" | "right" | "up" | "down" | null;

export interface SwipeHandlers {
  /** Called when a swipe is completed with a direction (if threshold met) */
  onSwipe: (direction: SwipeDirection) => void;
  /** Called continuously during drag with current offset */
  onDrag?: (offset: { x: number; y: number }) => void;
}

interface TouchPoint {
  x: number;
  y: number;
}

const SWIPE_THRESHOLD = 80; // min pixels to register a swipe
const SWIPE_VELOCITY_THRESHOLD = 0.5; // px/ms — fast flick counts even if short
const SWIPE_MAX_OFF_AXIS = 60; // max perpendicular drift to still count as directional

/**
 * Hook for detecting swipe gestures on touch devices.
 *
 * Usage:
 * ```tsx
 * const { offset, isSwiping, touchHandlers } = useSwipeGesture({
 *   onSwipe: (dir) => { if (dir === "left") answerCurrentCard("again"); }
 * });
 * return <div {...touchHandlers} style={{ transform: `translateX(${offset.x}px)` }} />;
 * ```
 */
export function useSwipeGesture(
  handlers: SwipeHandlers,
  enabled: boolean = true,
): {
  offset: { x: number; y: number };
  isSwiping: boolean;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
} {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  const startPoint = useRef<TouchPoint | null>(null);
  const startTime = useRef<number>(0);
  const lastPoint = useRef<TouchPoint | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref current via effect (not during render)
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      startPoint.current = { x: touch.clientX, y: touch.clientY };
      lastPoint.current = { x: touch.clientX, y: touch.clientY };
      startTime.current = Date.now();
      setIsSwiping(true);
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startPoint.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startPoint.current.x;
      const dy = touch.clientY - startPoint.current.y;
      lastPoint.current = { x: touch.clientX, y: touch.clientY };
      setOffset({ x: dx, y: dy });
      handlersRef.current.onDrag?.({ x: dx, y: dy });
    },
    [enabled],
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled || !startPoint.current) {
      setOffset({ x: 0, y: 0 });
      setIsSwiping(false);
      return;
    }

    const start = startPoint.current;
    const end = lastPoint.current ?? start;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const elapsed = Date.now() - startTime.current;
    const velocity = Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(elapsed, 1);

    let direction: SwipeDirection = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy) {
      // Horizontal swipe
      if (absDx >= SWIPE_THRESHOLD || (velocity >= SWIPE_VELOCITY_THRESHOLD && absDx > 30)) {
        if (absDy < SWIPE_MAX_OFF_AXIS) {
          direction = dx > 0 ? "right" : "left";
        }
      }
    } else {
      // Vertical swipe
      if (absDy >= SWIPE_THRESHOLD || (velocity >= SWIPE_VELOCITY_THRESHOLD && absDy > 30)) {
        if (absDx < SWIPE_MAX_OFF_AXIS) {
          direction = dy > 0 ? "down" : "up";
        }
      }
    }

    if (direction) {
      handlersRef.current.onSwipe(direction);
    }

    // Reset
    setOffset({ x: 0, y: 0 });
    setIsSwiping(false);
    startPoint.current = null;
    lastPoint.current = null;
  }, [enabled]);

  return {
    offset,
    isSwiping,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
