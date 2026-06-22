import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecallStore } from "@/stores/recall-store";
import { buildTagCounts } from "@/lib/tags";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Tag input with autocomplete suggestions from existing tags.
 * Supports typing new tags, pressing Enter/comma to add,
 * Backspace to remove last, and clicking X on chips.
 */
export function TagInput({ value, onChange, className, placeholder = "Add tags..." }: TagInputProps): JSX.Element {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cards = useRecallStore((state) => state.cards);
  const allTags = useMemo(() => {
    const counts = buildTagCounts(cards);
    return [...counts.keys()].sort((a, b) => {
      // Sort by count descending, then alphabetically
      const countDiff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
      return countDiff !== 0 ? countDiff : a.localeCompare(b);
    });
  }, [cards]);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    const q = input.toLowerCase().trim();
    return allTags
      .filter((t) => t.toLowerCase().includes(q) && !value.includes(t))
      .slice(0, 8);
  }, [allTags, input, value]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addTag(tag: string): void {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string): void {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        addTag(suggestions[selectedIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const val = e.target.value;
    // Handle comma-separated paste
    if (val.includes(",")) {
      const parts = val.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        // Add all but last, keep last in input
        const toAdd = parts.slice(0, -1);
        const remaining = parts[parts.length - 1];
        for (const tag of toAdd) {
          if (!value.includes(tag)) {
            onChange([...value, tag]);
          }
        }
        setInput(remaining);
        return;
      }
    }
    setInput(val);
    setShowSuggestions(val.trim().length > 0);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="flex flex-wrap gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1.5 focus-within:ring-1 focus-within:ring-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:ring-zinc-600"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (input.trim()) setShowSuggestions(true);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          autoComplete="off"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <ul className="max-h-48 overflow-y-auto py-1">
            {suggestions.map((tag, i) => (
              <li
                key={tag}
                className={cn(
                  "cursor-pointer px-3 py-1.5 text-sm transition-colors",
                  i === selectedIndex
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(tag);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="flex items-center gap-2">
                  <span>{tag}</span>
                  {tag.includes("::") && (
                    <span className="text-xs text-zinc-400">
                      {tag.split("::").slice(0, -1).join("::")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
