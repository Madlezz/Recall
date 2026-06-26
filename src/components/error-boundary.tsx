import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** View name for error logging context */
  viewName?: string;
  /** Called when user clicks recovery button; if provided, shows "Back to Dashboard" instead of refresh */
  onRecover?: () => void;
}

interface State {
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error;
  hasRecovery: boolean;
  onRecover: () => void;
}

function ErrorFallback({ error, hasRecovery, onRecover }: ErrorFallbackProps): JSX.Element {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  function handleCopyError(): void {
    const errorText = `${error.message}\n\n${error.stack ?? ""}`;
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md space-y-6 rounded-xl border bg-card p-8 text-center shadow-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <div>
          <h1 className="text-xl font-semibold">{t("errorBoundary.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("errorBoundary.dataSafe")}
            {hasRecovery
              ? t("errorBoundary.goBackHint")
              : t("errorBoundary.refreshHint")}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          {hasRecovery && (
            <Button
              variant="outline"
              onClick={onRecover}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("errorBoundary.backToDashboard")}
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("errorBoundary.refreshApp")}
          </Button>
        </div>
        <details className="text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            {t("errorBoundary.errorDetails")}
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
            {error.message}
            {"\n\n"}
            {error.stack ?? ""}
          </pre>
          <button
            data-copy-btn
            onClick={handleCopyError}
            className="mt-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
          >
            {copied ? t("errorBoundary.copied") : t("errorBoundary.copyError")}
          </button>
        </details>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const view = this.props.viewName ?? "unknown";
    console.error(`[Recall] Uncaught error in ${view}:`, error, info.componentStack);
  }

  handleRecover(): void {
    if (this.props.onRecover) {
      this.setState({ error: null });
      this.props.onRecover();
    } else {
      window.location.reload();
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const hasRecovery = !!this.props.onRecover;

      return (
        <ErrorFallback
          error={this.state.error}
          hasRecovery={hasRecovery}
          onRecover={() => this.handleRecover()}
        />
      );
    }

    return this.props.children;
  }
}
