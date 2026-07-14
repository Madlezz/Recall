import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmActionProps {
  title: string;
  description: string;
  actionLabel: string;
  triggerLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmAction({
  title,
  description,
  actionLabel,
  triggerLabel,
  destructive = false,
  onConfirm,
}: ConfirmActionProps): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm(): Promise<void> {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
<button
          type="button"
          className={cn(
            destructive
              ? "inline-flex items-center justify-center rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
              : "inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
          )}
        >
          {triggerLabel}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low active:scale-95 transition-all"
            >
              {t("confirmAction.cancel")}
            </button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <button
              type="button"
              className={cn(
                destructive
                  ? "inline-flex items-center justify-center rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
                  : "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-lg hover:shadow-xl active:scale-95 transition-all",
                pending && "opacity-50 cursor-not-allowed"
              )}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}
              disabled={pending}
            >
              {actionLabel}
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
