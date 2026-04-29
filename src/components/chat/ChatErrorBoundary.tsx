"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ChatErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Something went wrong" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ChatErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback message={this.state.errorMessage} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-5 py-20 px-6"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/[0.08] ring-1 ring-red-500/20">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>

      <div className="text-center max-w-sm">
        <h3 className="text-[15px] font-semibold text-white/90 mb-1.5">
          Something went wrong
        </h3>
        <p className="text-[13px] text-white/40 leading-relaxed">
          {message || "The chat engine encountered an unexpected error. Your data is safe."}
        </p>
      </div>

      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-xl bg-accent/10 px-5 py-2.5 text-[13px] font-medium text-accent ring-1 ring-accent/20 transition-all hover:bg-accent/20 hover:ring-accent/30 active:scale-[0.97]"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Retry
      </button>
    </motion.div>
  );
}
