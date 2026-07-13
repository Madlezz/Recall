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
import { Button } from "@/components/ui/button";
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
        <Button
          variant={destructive ? "destructive" : "outline"}
className={destructive
	            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
	            : "border-outline-variant text-text-secondary hover:bg-surface-container-high hover:text-text-primary dark:border-outline-variant dark:text-text-secondary dark:hover:bg-surface-container dark:hover:text-text-primary"
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
          <AlertDialogCancel asChild>
            <Button variant="outline" className="border-outline-variant text-text-secondary hover:bg-surface-container-high hover:text-text-primary dark:border-outline-variant dark:text-text-secondary dark:hover:bg-surface-container dark:hover:text-text-primary">
              {t("confirmAction.cancel")}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? "destructive" : "default"}
              className={destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-on-primary hover:bg-primary-hover dark:bg-primary dark:text-on-primary dark:hover:bg-primary-container"
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
