import { Component, type ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-xl font-semibold">{t("errorBoundary.somethingWentWrong")}</h1>
        <p className="text-sm text-on-surface-variant">{t("errorBoundary.description")}</p>

        <div className="flex gap-2 justify-center">
          {hasRecovery ? (
            <button
              onClick={onRecover}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              {t("errorBoundary.backToDashboard")}
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              {t("errorBoundary.refresh")}
            </button>
          )}
          <button
            onClick={handleCopyError}
            className="rounded-lg border border-outline bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-container-high"
          >
            {copied ? t("errorBoundary.copied") : t("errorBoundary.copyError")}
          </button>
        </div>

        <details className="text-left">
          <summary className="cursor-pointer text-sm text-on-surface-variant hover:text-text-secondary">
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
            className="mt-2 text-xs text-on-surface-variant hover:text-text-secondary"
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

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.viewName ? `:${this.props.viewName}` : ""}]`, error, info.componentStack);
  }

  handleRecover(): void {
    this.setState({ error: null });
    this.props.onRecover?.();
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const hasRecovery = typeof this.props.onRecover === "function";

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