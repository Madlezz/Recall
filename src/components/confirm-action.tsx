import {
  AlertCancelButton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
        <Button
          variant={destructive ? "destructive" : "outline"}
          className={destructive
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }
        >
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertCancelButton />
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? "destructive" : "default"}
              className={destructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              }
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}
              disabled={pending}
            >
              {actionLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
