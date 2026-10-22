import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local-only app: log to the dev console for diagnostics, never transmit.
    console.error("STEADY UI error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-canvas px-6">
          <div className="surface w-full max-w-[520px] p-7">
            <h1 className="text-[22px] font-extrabold tracking-[-0.7px] text-ink">
              Something interrupted this view
            </h1>
            <p className="mt-2 text-[12px] leading-relaxed text-[#8b9b92]">
              Your records are safe in local storage. Reload the window to
              continue; the last saved data will be reloaded from disk.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-5"
              onClick={() => window.location.reload()}
            >
              Reload STEADY
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
