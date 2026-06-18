import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
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
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="max-w-md space-y-6 rounded-xl border bg-card p-8 text-center shadow-lg">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <div>
              <h1 className="text-xl font-semibold">Something went wrong</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your data is safe — it's stored locally on your computer.
                {hasRecovery
                  ? " You can go back to the dashboard and try again."
                  : " Try refreshing the app to recover."}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              {hasRecovery && (
                <Button
                  variant="outline"
                  onClick={() => this.handleRecover()}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh App
              </Button>
            </div>
            <details className="text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack ?? ""}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}