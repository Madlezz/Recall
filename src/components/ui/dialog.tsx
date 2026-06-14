import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>): JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 p-1 text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("mb-6 space-y-1", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>): JSX.Element {
  return <DialogPrimitive.Title className={cn("text-base font-medium tracking-tight text-zinc-900 dark:text-zinc-100", className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>): JSX.Element {
  return <DialogPrimitive.Description className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800", className)} {...props} />;
}
