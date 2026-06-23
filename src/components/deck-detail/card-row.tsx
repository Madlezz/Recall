import { CheckSquare, Square, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardDialog } from "@/components/card-dialog";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import type { Card } from "@/types";

interface CardRowProps {
  card: Card;
  deckId: string;
  isSelected: boolean;
  onToggle: (cardId: string) => void;
}

export function CardRow({ card, deckId, isSelected, onToggle }: CardRowProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCard = useRecallStore((s) => s.deleteCard);
  const leechThreshold = useRecallStore((s) => s.settings.leechThreshold);
  const isLeech = card.lapses >= leechThreshold;

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteCard(card.id);
      toast.success("Card deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete card");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        isSelected && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onToggle(card.id)}
              className="flex h-5 w-5 items-center justify-center rounded border border-input transition-colors hover:bg-muted"
              aria-label={isSelected ? "Deselect card" : "Select card"}
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <Badge
              tone={
                card.state === "review"
                  ? "success"
                  : card.state === "learning" || card.state === "relearning"
                    ? "warning"
                    : "muted"
              }
            >
              {card.state}
            </Badge>
            {isLeech && (
              <Badge
                tone="warning"
                title={`Failed ${card.lapses} times (threshold: ${leechThreshold}). Consider rewriting this card.`}
              >
                ⚠️ Leech
              </Badge>
            )}
            {card.tags.map((tag) => (
              <Badge key={tag} tone="muted">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Card content */}
          <div className="mt-3 prose prose-sm prose-invert max-w-none line-clamp-1">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {card.front}
            </ReactMarkdown>
          </div>
          <div className="mt-1 prose prose-sm prose-invert max-w-none line-clamp-2 text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {card.back}
            </ReactMarkdown>
          </div>
          {card.hint && <p className="mt-2 text-xs text-muted-foreground">Hint: {card.hint}</p>}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <CardDialog
            deckId={deckId}
            card={card}
            trigger={<Button variant="outline">Edit</Button>}
          />
          <Button variant="ghost" onClick={() => void handleDelete()} disabled={isDeleting}>
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
