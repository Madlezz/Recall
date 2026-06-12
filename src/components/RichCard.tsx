import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import type { CardType } from "@/types";
import { renderCloze } from "@/lib/cloze";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface RichCardProps {
  content: string;
  isBack?: boolean;
  cardType?: CardType;
  revealed?: boolean;
}

function ClozeContent({ content, revealed }: { content: string; revealed: boolean }): JSX.Element {
  const { segments, isCloze } = renderCloze(content, revealed);
  
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
          >
            [...]
          </span>
        );
      })}
    </>
  );
}

export function RichCard({ content, isBack = false, cardType = "basic", revealed = true }: RichCardProps): JSX.Element {
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

  // Regular markdown rendering for basic cards and back side
  return (
    <div className={`prose prose-invert max-w-none ${isBack ? 'border-t pt-4 mt-4' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
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
        {content}
      </ReactMarkdown>
    </div>
  );
}