import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type ErrorType = "rate-limit" | "private" | "not-found" | "generic";

interface RepoErrorModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

function detectErrorType(message?: string): ErrorType {
  if (!message) return "generic";
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) return "rate-limit";
  if (lower.includes("private") || lower.includes("forbidden") || lower.includes("access forbidden")) return "private";
  if (lower.includes("not found")) return "not-found";
  return "generic";
}

const errorContent: Record<ErrorType, { title: string; titleItalic: string; description: string; tips: { heading: string; text: string }[] }> = {
  "rate-limit": {
    title: "Rate limit",
    titleItalic: "exceeded.",
    description: "GitHub restricts unauthenticated API requests. You have temporarily exceeded the allowed number of requests.",
    tips: [
      { heading: "Wait a moment", text: "GitHub resets rate limits every 60 seconds. Take a short break and try again." },
      { heading: "Use the test repository", text: "The sample repository button on the landing page works without the GitHub API." },
    ],
  },
  "private": {
    title: "Repository is",
    titleItalic: "private.",
    description: "Odin can only analyze publicly accessible repositories. This repository requires authentication to access.",
    tips: [
      { heading: "Make it public", text: "If this is your repository, go to Settings on GitHub and change the visibility to Public." },
      { heading: "Check the URL", text: "Ensure you are linking to the correct repository. The format should be github.com/owner/repo." },
    ],
  },
  "not-found": {
    title: "Repository",
    titleItalic: "not found.",
    description: "We could not locate this repository on GitHub. It may have been deleted, renamed, or the URL is incorrect.",
    tips: [
      { heading: "Verify the URL", text: "Double check that the link follows the format: github.com/owner/repository" },
      { heading: "Check for typos", text: "Repository names are case sensitive. Make sure the owner and repo name are spelled correctly." },
    ],
  },
  "generic": {
    title: "Something went",
    titleItalic: "wrong.",
    description: "We could not access this repository. This usually means one of the following.",
    tips: [
      { heading: "The repository is private", text: "Odin can only analyze public repositories. Consider making it public in your GitHub settings." },
      { heading: "The URL is incorrect", text: "Double check that the link follows the format: github.com/owner/repository" },
      { heading: "GitHub API rate limit", text: "Too many requests. Wait a moment and try again." },
    ],
  },
};

export function RepoErrorModal({ open, onClose, message }: RepoErrorModalProps) {
  const errorType = detectErrorType(message);
  const content = errorContent[errorType];
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose, open);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-card border border-border rounded-2xl p-10 max-w-lg w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <X size={16} className="text-muted-foreground" />
            </button>

            <h2 className="text-[2.5rem] leading-[1] font-serif tracking-tight text-foreground mb-4">
              {content.title} <span className="italic">{content.titleItalic}</span>
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {content.description}
            </p>

            <div className="space-y-4 mb-8">
              {content.tips.map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-foreground font-serif italic text-lg">{i + 1}.</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{tip.heading}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tip.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full bg-foreground text-background text-sm font-medium py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Try another repository
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
