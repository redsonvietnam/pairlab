import { useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface RepoTooLargeModalProps {
  open: boolean;
  onClose: () => void;
  fileCount: number;
}

export function RepoTooLargeModal({ open, onClose, fileCount }: RepoTooLargeModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose, open);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(12px)" }}
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md rounded-2xl p-6 text-center space-y-4"
        style={{
          background: "hsl(var(--card) / 0.95)",
          border: "1px solid hsl(var(--border) / 0.4)",
          boxShadow: "0 24px 80px -16px hsl(var(--foreground) / 0.15)",
        }}
      >
        <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center" style={{ background: "hsl(28, 75%, 50% / 0.12)" }}>
          <AlertTriangle size={22} style={{ color: "hsl(28, 75%, 50%)" }} />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Repository too large</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This repository contains <strong className="text-foreground">{fileCount.toLocaleString()}</strong> files, 
            which exceeds the analysis limit. AI analysis works best with smaller to mid-sized repositories.
          </p>
        </div>

        <div
          className="rounded-xl p-3 text-left space-y-1.5"
          style={{
            background: "hsl(var(--secondary) / 0.4)",
            border: "1px solid hsl(var(--border) / 0.3)",
          }}
        >
          <p className="text-[11px] font-medium text-foreground">Try a smaller repository</p>
          <p className="text-[11px] text-muted-foreground">
            Repositories under 500 files work best. The graph visualization will still render, but AI analysis has been skipped.
          </p>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "hsl(var(--foreground))",
            color: "hsl(var(--background))",
          }}
        >
          Got it
        </button>

        <p className="text-[10px] text-muted-foreground/60">Press ESC or click outside to close</p>
      </motion.div>
    </motion.div>
  );
}
