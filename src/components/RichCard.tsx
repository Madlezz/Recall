import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import type { CardType, ImageOcclusionData } from "@/types";
import { renderCloze } from "@/lib/cloze";
import { getImageUrl } from "@/services/images";
import { ImageOcclusionStudy } from "@/components/image-occlusion-study";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface RichCardProps {
  content: string;
  isBack?: boolean;
  cardType?: CardType;
  revealed?: boolean;
  allowHtml?: boolean;
}

function ClozeContent({ content, revealed }: { content: string; revealed: boolean }): JSX.Element {
  const { segments, isCloze } = renderCloze(content);

  if (!isCloze) {
    return <>{content}</>;
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.isCloze) {
          return <span key={i}>{seg.text}</span>;
        }
        if (revealed) {
          return (
            <span
              key={i}
              className="inline rounded bg-primary/20 px-1 font-bold text-primary border-b-2 border-primary/50"
            >
              {seg.text}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-base font-bold text-muted-foreground border border-dashed border-muted-foreground/30 min-w-[2.5rem] justify-center"
            title={seg.hint}
          >
            [{seg.hint || "..."}]
          </span>
        );
      })}
    </>
  );
}

/** Resolves recall:// images asynchronously with loading placeholder */
function RecallImage({ filename, alt }: { filename: string; alt?: string }): JSX.Element {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    getImageUrl(filename).then((url) => {
      if (!cancelled && url) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [filename]);

  if (!src) {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-dashed border-muted-foreground/30 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        🖼️ {alt || "Loading image..."}
      </span>
    );
  }

  return <img src={src} alt={alt ?? ""} className="max-w-full rounded-lg" />;
}

/**
 * Rewrite recall:// protocol to a sanitizer-friendly https://recall.local/
 * so rehype-sanitize doesn't strip the img src.
 */
function preprocessContent(content: string): string {
  return content.replace(
    /!\[([^\]]*)\]\(recall:\/\/([^)]+)\)/g,
    "![$1](https://recall.local/$2)",
  );
}

export function RichCard({ content, isBack = false, cardType = "basic", revealed = true, allowHtml = false }: RichCardProps): JSX.Element {
  // Image occlusion cards
  if (cardType === "image-occlusion") {
    let occlusionData: ImageOcclusionData;
    try {
      occlusionData = JSON.parse(content) as ImageOcclusionData;
    } catch {
      return <div className="text-red-500">Invalid image occlusion data</div>;
    }
    return (
      <div className="w-full">
        <ImageOcclusionStudy data={occlusionData} revealed={revealed} />
      </div>
    );
  }

  // For cloze cards that aren't revealed yet, render blanks inline
  if (cardType === "cloze" && !revealed && !isBack) {
    return (
      <div className="text-2xl font-medium leading-relaxed">
        <ClozeContent content={content} revealed={false} />
      </div>
    );
  }

  // For cloze cards that ARE revealed, render with highlights
  if (cardType === "cloze" && revealed && !isBack) {
    return (
      <div className="text-2xl font-medium leading-relaxed">
        <ClozeContent content={content} revealed={true} />
      </div>
    );
  }

  // Pre-process recall:// images before markdown rendering
  const processed = preprocessContent(content);

  // Regular markdown rendering for basic cards and back side
  return (
    <div className={`prose prose-invert max-w-none ${isBack ? 'border-t pt-4 mt-4' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[
          ...(allowHtml ? [rehypeRaw] : []),
          [rehypeSanitize, {
          // Restrict sanitizer: disallow form elements and interactive HTML in cards
          ...defaultSchema,
          tagNames: defaultSchema.tagNames?.filter(
            (t: string) => !["form", "input", "textarea", "button", "select", "details", "summary"].includes(t),
          ),
        }], rehypeHighlight, rehypeKatex]}
        components={{
          img({ src, alt }: React.ComponentPropsWithoutRef<"img">) {
            if (src && src.startsWith("https://recall.local/")) {
              const filename = src.replace("https://recall.local/", "");
              return <RecallImage filename={filename} alt={alt ?? undefined} />;
            }
            // Block all remote/external images for privacy (offline-first app)
            // Only allow local recall:// images via the RecallImage component
            if (src && (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//"))) {
              return (
                <span className="inline-flex items-center gap-2 rounded border border-dashed border-muted-foreground/30 bg-muted/50 px-3 py-2 text-sm text-muted-foreground" title={src}>
                  🚫 Remote image blocked (privacy)
                </span>
              );
            }
            return <img src={src} alt={alt ?? ""} className="max-w-full rounded-lg" />;
          },
          code({ children, className, inline, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}