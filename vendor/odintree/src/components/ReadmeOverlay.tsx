import { useRef } from "react";
import { motion } from "framer-motion";
import { ReadmeView } from "./ReadmeView";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface Props {
  files: { path: string; content: string }[];
  repoName: string;
  repoUrl: string;
  existingReadme?: string;
  onClose: () => void;
}

export function ReadmeOverlay({ files, repoName, repoUrl, existingReadme, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose, true);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }}
    >
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--card) / 0.95)",
          border: "1px solid hsl(var(--border) / 0.4)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 80px -16px hsl(var(--foreground) / 0.15)",
        }}
      >
        <ReadmeView files={files} repoName={repoName} repoUrl={repoUrl} existingReadme={existingReadme} />
      </motion.div>
    </motion.div>
  );
}