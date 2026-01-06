"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for quiz components.
 * Catches rendering errors and displays a fallback UI instead of crashing.
 */
export class QuizErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error("[QuizErrorBoundary] Caught error:", error);
    console.error("[QuizErrorBoundary] Component stack:", errorInfo.componentStack);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI for overlay context (minimal, transparent-friendly)
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="bg-black/80 text-white p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-bold mb-2">Quiz Display Error</h2>
            <p className="text-gray-300 mb-4">
              An error occurred while rendering the quiz.
            </p>
            {this.state.error && (
              <p className="text-sm text-red-400 mb-4 font-mono">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
