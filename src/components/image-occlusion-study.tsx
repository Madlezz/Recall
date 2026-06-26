import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ImageOcclusionData, OcclusionShape } from "@/types";
import { getImageUrl } from "@/services/images";

interface Props {
  data: ImageOcclusionData;
  revealed: boolean;
}

export function ImageOcclusionStudy({ data, revealed }: Props) {
  const { t } = useTranslation();
  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawShape = useCallback((
    ctx: CanvasRenderingContext2D,
    shape: OcclusionShape,
    img: HTMLImageElement,
    isRevealed: boolean,
    index: number
  ) => {
    const x = (shape.x / 100) * img.width;
    const y = (shape.y / 100) * img.height;
    const w = (shape.width / 100) * img.width;
    const h = (shape.height / 100) * img.height;

    if (isRevealed) {
      // Show label
      ctx.fillStyle = "rgba(34, 197, 94, 0.3)"; // green
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(shape.label, x + w / 2, y + h / 2);
      ctx.shadowBlur = 0;
    } else {
      // Hide with overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Show index number
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${index + 1}`, x + w / 2, y + h / 2);
    }
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw occlusions
    data.occlusions.forEach((shape, i) => {
      const isRevealed = revealed || revealedIndex === i;
      drawShape(ctx, shape, img, isRevealed, i);
    });
  }, [data.occlusions, revealed, revealedIndex, drawShape]);

  // Load image
  useEffect(() => {
    if (!data.imageUrl) return;

    getImageUrl(data.imageUrl).then((url) => {
      if (!url) return;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = url;
    });
  }, [data.imageUrl, drawCanvas]);

  // Redraw when revealed state changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleRevealNext = () => {
    if (revealedIndex === null) {
      setRevealedIndex(0);
    } else if (revealedIndex < data.occlusions.length - 1) {
      setRevealedIndex(revealedIndex + 1);
    }
  };

  const handleRevealAll = () => {
    setRevealedIndex(null);
  };

  const allRevealed = revealed || (revealedIndex !== null && revealedIndex >= data.occlusions.length - 1);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
      />

      {!revealed && !allRevealed && (
        <div className="flex gap-2">
          <button
            onClick={handleRevealNext}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {revealedIndex === null ? t("imageOcclusionStudy.revealFirst") : t("imageOcclusionStudy.revealNext")}
          </button>
          {revealedIndex !== null && (
            <button
              onClick={handleRevealAll}
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              {t("imageOcclusionStudy.revealAll")}
            </button>
          )}
        </div>
      )}

      {revealedIndex !== null && !revealed && (
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t("imageOcclusionStudy.revealed", { current: revealedIndex + 1, total: data.occlusions.length })}
        </p>
      )}
    </div>
  );
}
