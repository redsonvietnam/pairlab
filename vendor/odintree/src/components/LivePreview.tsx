import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, RefreshCw } from "lucide-react";

interface LivePreviewProps {
  open: boolean;
  onClose: () => void;
  fileContents: Record<string, string>;
}

function buildPreviewHtml(fileContents: Record<string, string>): string {
  // Find index.html or any HTML file
  const htmlFile = Object.keys(fileContents).find(
    (k) => k.endsWith("index.html") || k.endsWith(".html")
  );
  
  // Collect CSS
  const cssFiles = Object.entries(fileContents).filter(([k]) => 
    k.endsWith(".css")
  );
  const cssContent = cssFiles.map(([, v]) => v).join("\n");

  // Collect JS
  const jsFiles = Object.entries(fileContents).filter(([k]) => 
    k.endsWith(".js") && !k.endsWith(".min.js") && !k.endsWith(".config.js")
  );
  const jsContent = jsFiles.map(([, v]) => v).join("\n;\n");

  if (htmlFile) {
    let html = fileContents[htmlFile];
    // Inject CSS before </head>
    if (cssContent) {
      html = html.replace("</head>", `<style>${cssContent}</style></head>`);
    }
    // Inject JS before </body>
    if (jsContent) {
      html = html.replace("</body>", `<script>${jsContent}</script></body>`);
    }
    return html;
  }

  // Fallback: build a simple page
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;margin:2rem;color:#333}${cssContent}</style>
</head><body>
<p style="color:#999;text-align:center;margin-top:40vh">No HTML file found in repository</p>
<script>${jsContent}</script>
</body></html>`;
}

export function LivePreview({ open, onClose, fileContents }: LivePreviewProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!open) return null;

  const html = buildPreviewHtml(fileContents);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-md" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-[90vw] max-w-[1400px] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          style={{ aspectRatio: "19/10" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-sm text-muted-foreground">Live Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => window.open(url, "_blank")}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* iframe */}
          <div className="w-full" style={{ height: "calc(100% - 48px)" }}>
            <iframe
              key={refreshKey}
              src={url}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-full border-0 bg-white"
              title="Live Preview"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
