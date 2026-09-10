import { motion } from "framer-motion";

interface Step {
  label: string;
  done: boolean;
}

export function AnalyzingOverlay({ steps }: { steps: Step[] }) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const progress = steps.filter((s) => s.done).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
    >
      <div className="max-w-md w-full mx-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[clamp(2rem,5vw,3.5rem)] font-serif tracking-tight text-foreground leading-[1] mb-3"
        >
          Reading the
          <br />
          <span className="italic">repository.</span>
        </motion.h2>

        <p className="text-sm text-muted-foreground mb-10">
          {progress} of {steps.length} steps complete
        </p>

        <div className="space-y-4 text-left">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex items-center gap-4"
            >
              <span className={`text-xs font-mono w-5 text-right ${step.done ? "text-foreground" : "text-muted-foreground/40"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`text-sm transition-colors duration-300 ${
                  step.done
                    ? "text-foreground font-medium line-through decoration-muted-foreground/30"
                    : i === currentIndex
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/40"
                }`}
              >
                {step.label}
              </span>
              {i === currentIndex && !step.done && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-foreground"
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
