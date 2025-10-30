"use client";

import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service (Sentry)
    console.error("Error caught by boundary:", error, errorInfo);
    
    // You can send to Sentry here:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <motion.div
          className="min-h-[400px] flex items-center justify-center px-4 py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-md w-full">
            <motion.div
              className="text-center space-y-6"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Icon */}
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                transition={{ 
                  scale: { delay: 0.2, type: "spring", stiffness: 300 },
                  rotate: { delay: 0.4, duration: 0.5 }
                }}
              >
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </motion.div>

              {/* Title */}
              <div className="space-y-2">
                <h2 className="text-2xl font-light text-foreground">
                  Something went wrong
                </h2>
                <p className="text-sm font-light text-muted-foreground">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
              </div>

              {/* Error details (dev only) */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <motion.div
                  className="mt-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-left"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.message}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => {
                      this.resetErrorBoundary();
                      window.location.reload();
                    }}
                    className="rounded-full px-6"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh page
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    className="rounded-full px-6"
                    onClick={(e) => {
                      e.preventDefault();
                      this.resetErrorBoundary();
                      // Use window.location for a full reset
                      window.location.href = "/";
                    }}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go home
                  </Button>
                </motion.div>
              </motion.div>

              {/* Help text */}
              <motion.p
                className="text-xs font-light text-muted-foreground pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                If this problem persists, please contact support.
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

