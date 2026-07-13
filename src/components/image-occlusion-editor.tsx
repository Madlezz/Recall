import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus } from "lucide-react";
import type { ImageOcclusionData, OcclusionShape } from "@/types";
import { insertImage, getImageUrl } from "@/services/images";

interface Props {
  value: ImageOcclusionData | null;
  onChange: (data: ImageOcclusionData | null) => void;
}

export function ImageOcclusionEditor({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentShape, setCurrentShape] = useState<OcclusionShape | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: OcclusionShape, img: HTMLImageElement) => {
    const x = (shape.x / 100) * img.width;
    const y = (shape.y / 100) * img.height;
    const w = (shape.width / 100) * img.width;
    const h = (shape.height / 100) * img.height;

    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label
    if (shape.label) {
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(shape.label, x + w / 2, y + h / 2);
    }
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw existing occlusions
    value?.occlusions.forEach((shape) => {
      drawShape(ctx, shape, img);
    });

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape, img);
    }
  }, [value?.occlusions, currentShape, drawShape]);

  // Load image when imageUrl changes
  useEffect(() => {
    if (!value?.imageUrl) {
      imageRef.current = null;
      return;
    }

    getImageUrl(value.imageUrl).then((url) => {
      if (!url) return;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = url;
    });
  }, [value?.imageUrl, drawCanvas]);

  // Redraw canvas when shapes change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageRef.current) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDrawing(true);
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startPos || !imageRef.current) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const width = x - startPos.x;
    const height = y - startPos.y;

    setCurrentShape({
      id: "temp",
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(width),
      height: Math.abs(height),
      label: "",
    });

    drawCanvas();
  };

  const handleMouseUp = () => {
    if (!drawing || !currentShape || !value) return;

    const label = prompt(t("imageOcclusionEditor.enterLabelPrompt"));
    if (label === null) {
      // Cancelled
      setDrawing(false);
      setStartPos(null);
      setCurrentShape(null);
      drawCanvas();
      return;
    }

    const newShape: OcclusionShape = {
      ...currentShape,
      id: Date.now().toString(),
      label,
    };

    onChange({
      ...value,
      occlusions: [...value.occlusions, newShape],
    });

    setDrawing(false);
    setStartPos(null);
    setCurrentShape(null);
  };

  const handleUploadImage = async () => {
    const filename = await insertImage();
    if (filename) {
      onChange({
        imageUrl: filename,
        occlusions: [],
      });
    }
  };

  const handleRemoveShape = (shapeId: string) => {
    if (!value) return;
    onChange({
      ...value,
      occlusions: value.occlusions.filter((s) => s.id !== shapeId),
    });
  };

  return (
    <div className="space-y-4">
      {!value?.imageUrl ? (
        <button
          onClick={handleUploadImage}
          className="w-full rounded-lg border-2 border-dashed border-outline bg-background p-8 text-center hover:border-outline hover:bg-surface-container-high dark:border-outline dark:bg-surface dark:hover:border-outline dark:hover:bg-surface-container"
        >
          <Plus className="mx-auto mb-2 h-8 w-8 text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant dark:text-on-surface-variant">{t("imageOcclusionEditor.clickToUpload")}</p>
        </button>
      ) : (
        <>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair rounded-lg border border-outline-variant dark:border-outline"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              role="application"
              aria-label={t("imageOcclusionEditor.canvasAria")}
              tabIndex={0}
            />
            <button
              onClick={handleUploadImage}
              className="absolute right-2 top-2 rounded bg-primary/80 px-3 py-1 text-xs text-on-primary hover:bg-primary"
            >
              {t("imageOcclusionEditor.changeImage")}
            </button>
          </div>

          {value.occlusions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary dark:text-text-secondary">
                {t("imageOcclusionEditor.occlusions", { count: value.occlusions.length })}:
              </p>
              {value.occlusions.map((shape, i) => (
                <div
                  key={shape.id}
                  className="flex items-center justify-between rounded border border-outline-variant bg-background p-2 dark:border-outline dark:bg-surface"
                >
                  <span className="text-sm text-text-secondary dark:text-text-secondary">
                    {i + 1}. {shape.label}
                  </span>
                  <button
                    onClick={() => handleRemoveShape(shape.id)}
                    className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-text-secondary dark:hover:bg-surface-container dark:hover:text-text-secondary"
                    aria-label={t("imageOcclusionEditor.removeShape", { label: shape.label })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-on-surface-variant dark:text-on-surface-variant">
            {t("imageOcclusionEditor.drawHint")}
          </p>
        </>
      )}
    </div>
  );
}