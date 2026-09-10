import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getUserConfig, setUserConfig, clearUserConfig, DEFAULT_AI_BASE, DEFAULT_AI_MODEL, type UserConfig } from "@/lib/user-config";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<UserConfig>(getUserConfig());

  useEffect(() => { if (open) setCfg(getUserConfig()); }, [open]);

  const save = () => {
    setUserConfig(cfg);
    toast.success("Settings saved. New keys will be used for the next request.");
    onClose();
  };

  const reset = () => {
    clearUserConfig();
    setCfg({ githubToken: "", aiBaseUrl: "", aiApiKey: "", aiModel: "" });
    toast.success("Custom keys cleared. Falling back to defaults.");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 odin-overlay-backdrop flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
            className="relative w-full max-w-lg rounded-2xl odin-overlay-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Settings"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-muted-foreground" />
                <h2 className="text-lg font-display font-semibold">Settings</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                Keys are stored only in this browser. The deployment Vite and backend keys are optional. If you only have an AI key (Gemini, OpenAI, or any OpenAI compatible provider), paste it below and Odin will use it for every request.
              </p>

              <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quick presets</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCfg({ ...cfg, aiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", aiModel: "gemini-2.5-flash" })}
                    className="rounded-md bg-background/70 border border-border/50 px-2.5 py-1 text-[11px] hover:bg-background transition-colors"
                  >
                    Use Google Gemini
                  </button>
                  <button
                    onClick={() => setCfg({ ...cfg, aiBaseUrl: "https://api.openai.com/v1", aiModel: "gpt-4o-mini" })}
                    className="rounded-md bg-background/70 border border-border/50 px-2.5 py-1 text-[11px] hover:bg-background transition-colors"
                  >
                    Use OpenAI
                  </button>
                  <button
                    onClick={() => setCfg({ ...cfg, aiBaseUrl: "", aiModel: "" })}
                    className="rounded-md bg-background/70 border border-border/50 px-2.5 py-1 text-[11px] hover:bg-background transition-colors"
                  >
                    Use deployment default
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  Tip: get a free Gemini API key at aistudio.google.com/apikey, paste it as the AI API Key, and pick the Gemini preset.
                </p>
              </div>

              <Field
                label="GitHub Personal Access Token"
                hint="Optional. Used for higher API rate limits. Needs no scopes for public repos."
                value={cfg.githubToken}
                onChange={(v) => setCfg({ ...cfg, githubToken: v })}
                placeholder="ghp_..."
                password
              />

              <div className="border-t border-border/40 pt-5 space-y-5">
                <Field
                  label="AI API Key"
                  hint="Gemini, OpenAI, or any OpenAI-compatible provider key."
                  value={cfg.aiApiKey}
                  onChange={(v) => setCfg({ ...cfg, aiApiKey: v })}
                  placeholder="AIza... or sk-..."
                  password
                />
                <Field
                  label="AI Base URL"
                  hint={`OpenAI-compatible endpoint. Leave blank to use ${DEFAULT_AI_BASE}.`}
                  value={cfg.aiBaseUrl}
                  onChange={(v) => setCfg({ ...cfg, aiBaseUrl: v })}
                  placeholder={DEFAULT_AI_BASE}
                />
                <Field
                  label="AI Model"
                  hint={`Examples: gemini-2.5-flash, ${DEFAULT_AI_MODEL}, gpt-4o-mini. Leave blank for default.`}
                  value={cfg.aiModel}
                  onChange={(v) => setCfg({ ...cfg, aiModel: v })}
                  placeholder={DEFAULT_AI_MODEL}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/40">
              <button onClick={reset} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <Trash2 size={12} /> Clear all
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] hover:bg-secondary/60">Cancel</button>
                <button onClick={save} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-foreground text-background">
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, hint, value, onChange, placeholder, password }: { label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string; password?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <input
        type={password ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-[13px] font-mono outline-none focus:ring-1 focus:ring-ring"
      />
      {hint && <span className="block text-[11px] text-muted-foreground/80">{hint}</span>}
    </label>
  );
}
