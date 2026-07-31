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

// Higher committed distance + stronger on-axis rule guard against accidental
// ratings (mis-swipes write real FSRS reviews). Visual preview should start
// signaling intent well before SWIPE_COMMIT_DISTANCE.
const SWIPE_PREVIEW_DISTANCE = 30; // px at which UI should start showing intent
const SWIPE_COMMIT_DISTANCE = 120; // px required to commit a rating
const SWIPE_VELOCITY_THRESHOLD = 0.7; // px/ms - must also be fast to commit early
const SWIPE_MAX_OFF_AXIS = 40; // px of perpendicular drift before it stops being directional

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
      const longEnough = absDx >= SWIPE_COMMIT_DISTANCE;
      const fastEnough = velocity >= SWIPE_VELOCITY_THRESHOLD && absDx > SWIPE_PREVIEW_DISTANCE;
      if ((longEnough || fastEnough) && absDy < SWIPE_MAX_OFF_AXIS) {
        direction = dx > 0 ? "right" : "left";
      }
    } else {
      // Vertical swipe
      const longEnough = absDy >= SWIPE_COMMIT_DISTANCE;
      const fastEnough = velocity >= SWIPE_VELOCITY_THRESHOLD && absDy > SWIPE_PREVIEW_DISTANCE;
      if ((longEnough || fastEnough) && absDx < SWIPE_MAX_OFF_AXIS) {
        direction = dy > 0 ? "down" : "up";
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
