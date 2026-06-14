import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;

export function AlertDialogContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>): JSX.Element {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("mb-6 space-y-1", className)} {...props} />;
}

export function AlertDialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>): JSX.Element {
  return <AlertDialogPrimitive.Title className={cn("text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100", className)} {...props} />;
}

export function AlertDialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>): JSX.Element {
  return <AlertDialogPrimitive.Description className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800", className)} {...props} />;
}

export function AlertCancelButton(props: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>): JSX.Element {
  return (
    <AlertDialogPrimitive.Cancel asChild {...props}>
      <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">
        Cancel
      </Button>
    </AlertDialogPrimitive.Cancel>
  );
}
