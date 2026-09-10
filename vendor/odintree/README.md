# Odin

Odin is a visual repository explorer that turns any public GitHub project into a navigable graph, a searchable knowledge base, and a set of AI-assisted reports. Paste a repo URL and Odin loads the file tree, builds a force-directed graph of the codebase, lets you inspect any file in a focused side panel, and layers in security inspection, dependency risk, commit history, code ownership mapping, AI deep-dive analysis, a learning path, and README generation on top of the same source tree.

It is built for developers who need to evaluate, document, or onboard onto an unfamiliar codebase without cloning it.

## What Odin Does

- Renders the full repository as an interactive React Flow graph with file and folder nodes.
- Streams file contents on demand through a serverless GitHub proxy so no personal access token is required.
- Spotlight-style command palette (Cmd+K) that searches file paths and indexed source content.
- AI deep-dive analysis covering architecture, execution flow, component breakdown, key algorithms, language breakdown, security inspection, and a glossary.
- README generator that refines an existing README when one exists or writes a clean new one otherwise.
- Security inspection exportable as Markdown or PDF.
- Commit story timeline with calendar heatmap, monthly themes, biggest rewrites, and milestone cards.
- AI activity report for the last 7, 30, or 90 days (digest, changelog draft, README snippet).
- Dependency risk analyzer for `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, and `Gemfile`, cross-referenced with OSV.dev.
- Code ownership map per folder with orphaned file and risky concentration detection.
- AI learning path: ordered, file-by-file reading plan based on the repo and your current selection.
- Complexity heatmap overlay on the graph.
- Custom API key settings: paste your own GitHub token and AI provider key and Odin uses them instead of the bundled defaults.

## Architecture

```
Browser (React + Vite)
  -> /api/github-proxy (Vercel function, optional GitHub token)
  -> Supabase Edge Functions
       analyze-repo
       generate-readme
       summarize-activity
       learning-path
  -> OpenAI-compatible AI gateway (configurable)
  -> Validated JSON -> Workspace overlays
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, TypeScript |
| Styling | Tailwind CSS, shadcn/ui, Instrument Serif + Space Grotesk |
| Graph | React Flow (`@xyflow/react`) |
| Animation | Framer Motion |
| Diagrams | Mermaid |
| Backend | Supabase Edge Functions (Deno) |
| AI gateway | OpenAI-compatible, defaults to `google/gemini-2.5-flash` |
| Hosting | Vercel (proxy + static build) |

## Design System

- Typography: Instrument Serif for display, Space Grotesk for headings, Inter for body, JetBrains Mono for code.
- Palette: high-contrast black and white with inverted text selection. Dark and light modes share semantic tokens defined in `src/index.css`.
- Component vocabulary: glass card overlays, single accent green, and one motion language per overlay.

## Configuration

The app runs on Vercel. Set these environment variables in the Vercel project, not in a committed `.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Backend URL for edge functions |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref for the backend |
| `GITHUB_TOKEN` | Optional default token used by the GitHub proxy |

Backend (edge function) secrets, configured on the backend side:

| Secret | Purpose |
|--------|---------|
| `AI_GATEWAY_KEY` or `OPENAI_API_KEY` | AI gateway key. First one found is used. |
| `AI_GATEWAY_URL` | Optional override for the OpenAI-compatible base URL |
| `AI_DEFAULT_MODEL` | Optional override (default `google/gemini-2.5-flash`) |

### Per-user overrides

Forking and self-hosting Odin does not require shipping any of your own keys to users. Any visitor can open Settings (cog icon, top toolbar) and paste:

- A GitHub Personal Access Token
- An AI API key, base URL, and model

These are stored only in the visitor's browser and override the deployment defaults for every request that visitor makes.

## Installation

```bash
git clone <repo-url>
cd odin
npm install
npm run dev
```

Open `http://localhost:8080`.

## Deployment (Vercel)

1. Import the repository on Vercel.
2. Set the environment variables listed above in Project Settings.
3. Deploy. The `/api/github-proxy.ts` serverless function deploys automatically.
4. Deploy the Supabase edge functions in `supabase/functions/` to your backend.

## Project Structure

```
src/pages/Landing.tsx           Landing page with the URL input
src/pages/Workspace.tsx         Main graph, overlays, toolbar
src/components/                 Overlays, file tree, graph node, settings dialog
src/lib/ai-analysis.ts          Client-side validation + edge function calls
src/lib/user-config.ts          localStorage-backed user API keys
api/github-proxy.ts             Vercel serverless GitHub proxy
supabase/functions/             Edge functions: analyze, README, activity, learning
```

## License

MIT
