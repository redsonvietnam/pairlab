import type { RepoFile } from "./github";
import type { RepoInfo } from "./github";

export const sampleRepoInfo: RepoInfo = {
  owner: "odin-sample",
  repo: "multi-lang-demo",
  description: "A sample multi-language project for testing Odin without GitHub API",
  language: "TypeScript",
  stars: 128,
  forks: 34,
  defaultBranch: "main",
};

export const sampleRepoFiles: RepoFile[] = [
  { path: "package.json", name: "package.json", type: "file", size: 820, sha: "a1", url: "", language: "JSON" },
  { path: "tsconfig.json", name: "tsconfig.json", type: "file", size: 340, sha: "a2", url: "", language: "JSON" },
  { path: "README.md", name: "README.md", type: "file", size: 2100, sha: "a3", url: "", language: "Markdown" },
  { path: ".gitignore", name: ".gitignore", type: "file", size: 120, sha: "a4", url: "", language: "Other" },
  { path: "Dockerfile", name: "Dockerfile", type: "file", size: 450, sha: "a5", url: "", language: "Other" },

  // src directory
  { path: "src", name: "src", type: "dir", sha: "d1", url: "" },
  { path: "src/index.ts", name: "index.ts", type: "file", size: 1200, sha: "b1", url: "", language: "TypeScript" },
  { path: "src/app.tsx", name: "app.tsx", type: "file", size: 2400, sha: "b2", url: "", language: "TypeScript" },
  { path: "src/main.tsx", name: "main.tsx", type: "file", size: 380, sha: "b3", url: "", language: "TypeScript" },
  { path: "src/router.ts", name: "router.ts", type: "file", size: 960, sha: "b4", url: "", language: "TypeScript" },
  { path: "src/types.ts", name: "types.ts", type: "file", size: 1800, sha: "b5", url: "", language: "TypeScript" },
  { path: "src/constants.ts", name: "constants.ts", type: "file", size: 540, sha: "b6", url: "", language: "TypeScript" },

  // src/components
  { path: "src/components", name: "components", type: "dir", sha: "d2", url: "" },
  { path: "src/components/Header.tsx", name: "Header.tsx", type: "file", size: 1900, sha: "c1", url: "", language: "TypeScript" },
  { path: "src/components/Footer.tsx", name: "Footer.tsx", type: "file", size: 1100, sha: "c2", url: "", language: "TypeScript" },
  { path: "src/components/Sidebar.tsx", name: "Sidebar.tsx", type: "file", size: 2200, sha: "c3", url: "", language: "TypeScript" },
  { path: "src/components/Card.tsx", name: "Card.tsx", type: "file", size: 800, sha: "c4", url: "", language: "TypeScript" },
  { path: "src/components/Button.tsx", name: "Button.tsx", type: "file", size: 650, sha: "c5", url: "", language: "TypeScript" },
  { path: "src/components/Modal.tsx", name: "Modal.tsx", type: "file", size: 1400, sha: "c6", url: "", language: "TypeScript" },

  // src/hooks
  { path: "src/hooks", name: "hooks", type: "dir", sha: "d3", url: "" },
  { path: "src/hooks/useAuth.ts", name: "useAuth.ts", type: "file", size: 1600, sha: "h1", url: "", language: "TypeScript" },
  { path: "src/hooks/useTheme.ts", name: "useTheme.ts", type: "file", size: 720, sha: "h2", url: "", language: "TypeScript" },
  { path: "src/hooks/useApi.ts", name: "useApi.ts", type: "file", size: 1300, sha: "h3", url: "", language: "TypeScript" },

  // src/utils
  { path: "src/utils", name: "utils", type: "dir", sha: "d4", url: "" },
  { path: "src/utils/format.ts", name: "format.ts", type: "file", size: 900, sha: "u1", url: "", language: "TypeScript" },
  { path: "src/utils/validate.ts", name: "validate.ts", type: "file", size: 1100, sha: "u2", url: "", language: "TypeScript" },
  { path: "src/utils/helpers.py", name: "helpers.py", type: "file", size: 2800, sha: "u3", url: "", language: "Python" },

  // src/styles
  { path: "src/styles", name: "styles", type: "dir", sha: "d5", url: "" },
  { path: "src/styles/globals.css", name: "globals.css", type: "file", size: 1400, sha: "s1", url: "", language: "CSS" },
  { path: "src/styles/components.css", name: "components.css", type: "file", size: 2100, sha: "s2", url: "", language: "CSS" },
  { path: "src/styles/theme.scss", name: "theme.scss", type: "file", size: 1800, sha: "s3", url: "", language: "SCSS" },

  // src/pages
  { path: "src/pages", name: "pages", type: "dir", sha: "d6", url: "" },
  { path: "src/pages/Home.tsx", name: "Home.tsx", type: "file", size: 3200, sha: "p1", url: "", language: "TypeScript" },
  { path: "src/pages/Dashboard.tsx", name: "Dashboard.tsx", type: "file", size: 4100, sha: "p2", url: "", language: "TypeScript" },
  { path: "src/pages/Settings.tsx", name: "Settings.tsx", type: "file", size: 2600, sha: "p3", url: "", language: "TypeScript" },
  { path: "src/pages/Profile.tsx", name: "Profile.tsx", type: "file", size: 1900, sha: "p4", url: "", language: "TypeScript" },

  // server directory
  { path: "server", name: "server", type: "dir", sha: "d7", url: "" },
  { path: "server/index.ts", name: "index.ts", type: "file", size: 1500, sha: "sv1", url: "", language: "TypeScript" },
  { path: "server/routes.ts", name: "routes.ts", type: "file", size: 2200, sha: "sv2", url: "", language: "TypeScript" },
  { path: "server/middleware.ts", name: "middleware.ts", type: "file", size: 1800, sha: "sv3", url: "", language: "TypeScript" },
  { path: "server/database.ts", name: "database.ts", type: "file", size: 1400, sha: "sv4", url: "", language: "TypeScript" },

  // scripts
  { path: "scripts", name: "scripts", type: "dir", sha: "d8", url: "" },
  { path: "scripts/deploy.sh", name: "deploy.sh", type: "file", size: 680, sha: "sc1", url: "", language: "Shell" },
  { path: "scripts/setup.py", name: "setup.py", type: "file", size: 1200, sha: "sc2", url: "", language: "Python" },
  { path: "scripts/migrate.sql", name: "migrate.sql", type: "file", size: 2400, sha: "sc3", url: "", language: "SQL" },
  { path: "scripts/build.sh", name: "build.sh", type: "file", size: 420, sha: "sc4", url: "", language: "Shell" },

  // config
  { path: "config", name: "config", type: "dir", sha: "d9", url: "" },
  { path: "config/webpack.config.js", name: "webpack.config.js", type: "file", size: 3400, sha: "cf1", url: "", language: "JavaScript" },
  { path: "config/jest.config.js", name: "jest.config.js", type: "file", size: 560, sha: "cf2", url: "", language: "JavaScript" },
  { path: "config/settings.yaml", name: "settings.yaml", type: "file", size: 780, sha: "cf3", url: "", language: "YAML" },

  // api (Go)
  { path: "api", name: "api", type: "dir", sha: "d10", url: "" },
  { path: "api/main.go", name: "main.go", type: "file", size: 1800, sha: "go1", url: "", language: "Go" },
  { path: "api/handlers.go", name: "handlers.go", type: "file", size: 2600, sha: "go2", url: "", language: "Go" },
  { path: "api/models.go", name: "models.go", type: "file", size: 1200, sha: "go3", url: "", language: "Go" },

  // lib (Rust)
  { path: "lib", name: "lib", type: "dir", sha: "d11", url: "" },
  { path: "lib/parser.rs", name: "parser.rs", type: "file", size: 3200, sha: "rs1", url: "", language: "Rust" },
  { path: "lib/tokenizer.rs", name: "tokenizer.rs", type: "file", size: 2100, sha: "rs2", url: "", language: "Rust" },

  // tests
  { path: "tests", name: "tests", type: "dir", sha: "d12", url: "" },
  { path: "tests/app.test.tsx", name: "app.test.tsx", type: "file", size: 1600, sha: "t1", url: "", language: "TypeScript" },
  { path: "tests/utils.test.ts", name: "utils.test.ts", type: "file", size: 1100, sha: "t2", url: "", language: "TypeScript" },
  { path: "tests/test_helpers.py", name: "test_helpers.py", type: "file", size: 900, sha: "t3", url: "", language: "Python" },

  // docs
  { path: "docs", name: "docs", type: "dir", sha: "d13", url: "" },
  { path: "docs/guide.md", name: "guide.md", type: "file", size: 4500, sha: "doc1", url: "", language: "Markdown" },
  { path: "docs/api-reference.md", name: "api-reference.md", type: "file", size: 3200, sha: "doc2", url: "", language: "Markdown" },

  // HTML
  { path: "public", name: "public", type: "dir", sha: "d14", url: "" },
  { path: "public/index.html", name: "index.html", type: "file", size: 1100, sha: "htm1", url: "", language: "HTML" },

  // Java
  { path: "plugins", name: "plugins", type: "dir", sha: "d15", url: "" },
  { path: "plugins/Analyzer.java", name: "Analyzer.java", type: "file", size: 2800, sha: "j1", url: "", language: "Java" },
  { path: "plugins/Reporter.java", name: "Reporter.java", type: "file", size: 1900, sha: "j2", url: "", language: "Java" },

  // Ruby
  { path: "tools", name: "tools", type: "dir", sha: "d16", url: "" },
  { path: "tools/generator.rb", name: "generator.rb", type: "file", size: 1500, sha: "rb1", url: "", language: "Ruby" },
];

// Fake file contents with real import statements to create dependency edges
export const sampleFileContents: Record<string, string> = {
  "src/main.tsx": `import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

  "src/app.tsx": `import React from "react";
import { Router } from "./router";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Sidebar } from "./components/Sidebar";
import { useTheme } from "./hooks/useTheme";
import "./styles/globals.css";
import "./styles/components.css";

export function App() {
  const { theme } = useTheme();
  return (
    <div className={\`app \${theme}\`}>
      <Header />
      <div className="layout">
        <Sidebar />
        <Router />
      </div>
      <Footer />
    </div>
  );
}`,

  "src/router.ts": `import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import type { Route } from "./types";

export const routes: Route[] = [
  { path: "/", component: Home },
  { path: "/dashboard", component: Dashboard },
  { path: "/settings", component: Settings },
  { path: "/profile", component: Profile },
];`,

  "src/index.ts": `import { App } from "./app";
import { routes } from "./router";
import type { AppConfig } from "./types";
import { API_URL, VERSION } from "./constants";

export { App, routes };
export const config: AppConfig = { apiUrl: API_URL, version: VERSION };`,

  "src/types.ts": `export interface Route {
  path: string;
  component: React.ComponentType;
}

export interface AppConfig {
  apiUrl: string;
  version: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}`,

  "src/constants.ts": `export const API_URL = "https://api.example.com/v1";
export const VERSION = "2.4.1";
export const MAX_RETRIES = 3;
export const CACHE_TTL = 300000;`,

  "src/components/Header.tsx": `import React from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  return (
    <header>
      <h1>Multi-Lang Demo</h1>
      <nav>
        <Button onClick={toggle}>Theme</Button>
        {user ? <Button onClick={logout}>Logout</Button> : <Modal trigger="Login" />}
      </nav>
    </header>
  );
}`,

  "src/components/Footer.tsx": `import React from "react";
import { VERSION } from "../constants";

export function Footer() {
  return (
    <footer>
      <p>Multi-Lang Demo v{VERSION}</p>
    </footer>
  );
}`,

  "src/components/Sidebar.tsx": `import React from "react";
import { Card } from "./Card";
import { useApi } from "../hooks/useApi";
import { formatDate } from "../utils/format";

export function Sidebar() {
  const { data } = useApi("/sidebar-items");
  return (
    <aside>
      {data?.map((item: any) => (
        <Card key={item.id} title={item.name} subtitle={formatDate(item.date)} />
      ))}
    </aside>
  );
}`,

  "src/components/Card.tsx": `import React from "react";

interface CardProps { title: string; subtitle?: string; children?: React.ReactNode; }

export function Card({ title, subtitle, children }: CardProps) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {children}
    </div>
  );
}`,

  "src/components/Button.tsx": `import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", children, ...props }: ButtonProps) {
  return <button className={\`btn btn-\${variant}\`} {...props}>{children}</button>;
}`,

  "src/components/Modal.tsx": `import React, { useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";

interface ModalProps { trigger: string; children?: React.ReactNode; }

export function Modal({ trigger, children }: ModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{trigger}</Button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <Card title={trigger}>{children}</Card>
        </div>
      )}
    </>
  );
}`,

  "src/hooks/useAuth.ts": `import { useState, useEffect } from "react";
import { useApi } from "./useApi";
import type { User } from "../types";
import { API_URL } from "../constants";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const api = useApi(API_URL + "/auth/me");
  useEffect(() => { if (api.data) setUser(api.data); }, [api.data]);
  return { user, login: () => {}, logout: () => setUser(null) };
}`,

  "src/hooks/useTheme.ts": `import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setTheme(saved);
  }, []);
  const toggle = () => setTheme(t => t === "light" ? "dark" : "light");
  return { theme, toggle };
}`,

  "src/hooks/useApi.ts": `import { useState, useEffect } from "react";
import type { ApiResponse } from "../types";
import { MAX_RETRIES } from "../constants";
import { validateUrl } from "../utils/validate";

export function useApi(url: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!validateUrl(url)) return;
    fetch(url).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [url]);
  return { data, loading };
}`,

  "src/utils/format.ts": `export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US").format(new Date(date));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  return (bytes / 1024).toFixed(1) + " KB";
}`,

  "src/utils/validate.ts": `import { API_URL } from "../constants";

export function validateUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function validateEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}`,

  "src/utils/helpers.py": `import json
import os
from pathlib import Path

def load_config(path: str) -> dict:
    with open(path) as f:
        return json.load(f)

def get_env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)

def list_files(directory: str) -> list:
    return [str(p) for p in Path(directory).rglob("*") if p.is_file()]`,

  "src/styles/globals.css": `@import "./theme.scss";

:root {
  --primary: #3b82f6;
  --bg: #0f172a;
  --text: #e2e8f0;
}

body { margin: 0; font-family: Inter, sans-serif; background: var(--bg); color: var(--text); }
* { box-sizing: border-box; }`,

  "src/styles/components.css": `@import "./globals.css";

.card { border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; }
.btn { padding: 8px 16px; border-radius: 8px; cursor: pointer; }
.btn-primary { background: var(--primary); color: white; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }`,

  "src/styles/theme.scss": `$primary: #3b82f6;
$bg-dark: #0f172a;
$bg-light: #f8fafc;

:root {
  --primary: #{$primary};
}

.dark { --bg: #{$bg-dark}; --text: #e2e8f0; }
.light { --bg: #{$bg-light}; --text: #1e293b; }`,

  "src/pages/Home.tsx": `import React from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../utils/format";

export function Home() {
  const { user } = useAuth();
  return (
    <main>
      <h1>Welcome{user ? \`, \${user.name}\` : ""}</h1>
      <Card title="Getting Started">
        <p>Last updated: {formatDate(new Date())}</p>
        <Button>Learn More</Button>
      </Card>
    </main>
  );
}`,

  "src/pages/Dashboard.tsx": `import React from "react";
import { Card } from "../components/Card";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../hooks/useAuth";
import { formatBytes } from "../utils/format";
import { API_URL } from "../constants";

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useApi(API_URL + "/dashboard");
  if (loading) return <p>Loading...</p>;
  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="grid">
        {data?.widgets?.map((w: any) => (
          <Card key={w.id} title={w.name} subtitle={formatBytes(w.size)} />
        ))}
      </div>
    </div>
  );
}`,

  "src/pages/Settings.tsx": `import React from "react";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { validateEmail } from "../utils/validate";

export function Settings() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  return (
    <div>
      <h2>Settings</h2>
      <Card title="Appearance">
        <p>Current theme: {theme}</p>
        <Button onClick={toggle}>Toggle Theme</Button>
      </Card>
    </div>
  );
}`,

  "src/pages/Profile.tsx": `import React from "react";
import { Card } from "../components/Card";
import { useAuth } from "../hooks/useAuth";

export function Profile() {
  const { user } = useAuth();
  if (!user) return <p>Please log in.</p>;
  return (
    <Card title={user.name}>
      <p>{user.email}</p>
      <p>Role: {user.role}</p>
    </Card>
  );
}`,

  "server/index.ts": `import { createServer } from "http";
import { routes } from "./routes";
import { authMiddleware, corsMiddleware } from "./middleware";
import { connectDatabase } from "./database";

async function main() {
  await connectDatabase();
  const server = createServer((req, res) => {
    corsMiddleware(req, res);
    authMiddleware(req, res);
    routes(req, res);
  });
  server.listen(3000);
}

main();`,

  "server/routes.ts": `import { IncomingMessage, ServerResponse } from "http";
import { connectDatabase } from "./database";

export function routes(req: IncomingMessage, res: ServerResponse) {
  if (req.url === "/api/health") { res.end(JSON.stringify({ status: "ok" })); }
}`,

  "server/middleware.ts": `import { IncomingMessage, ServerResponse } from "http";

export function authMiddleware(req: IncomingMessage, res: ServerResponse) {
  const token = req.headers.authorization;
  if (!token) return;
}

export function corsMiddleware(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
}`,

  "server/database.ts": `const DB_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/demo";

export async function connectDatabase() {
  console.log("Connecting to", DB_URL);
}

export async function query(sql: string, params?: any[]) {
  return [];
}`,

  "api/main.go": `package main

import (
  "fmt"
  "net/http"
  "api/handlers"
)

func main() {
  http.HandleFunc("/api/analyze", handlers.AnalyzeHandler)
  fmt.Println("Server running on :8080")
  http.ListenAndServe(":8080", nil)
}`,

  "api/handlers.go": `package handlers

import (
  "encoding/json"
  "net/http"
  "api/models"
)

func AnalyzeHandler(w http.ResponseWriter, r *http.Request) {
  result := models.AnalysisResult{Score: 95, Issues: []string{}}
  json.NewEncoder(w).Encode(result)
}`,

  "api/models.go": `package models

type AnalysisResult struct {
  Score  int      \`json:"score"\`
  Issues []string \`json:"issues"\`
}

type Repository struct {
  Name   string \`json:"name"\`
  Branch string \`json:"branch"\`
}`,

  "lib/parser.rs": `use crate::tokenizer;

pub struct Parser {
    tokens: Vec<tokenizer::Token>,
    position: usize,
}

impl Parser {
    pub fn new(tokens: Vec<tokenizer::Token>) -> Self {
        Parser { tokens, position: 0 }
    }

    pub fn parse(&mut self) -> Result<AST, String> {
        Ok(AST { nodes: vec![] })
    }
}

pub struct AST { pub nodes: Vec<ASTNode> }
pub struct ASTNode { pub kind: String, pub value: String }`,

  "lib/tokenizer.rs": `pub struct Token {
    pub kind: TokenKind,
    pub value: String,
    pub line: usize,
}

pub enum TokenKind { Identifier, Number, Operator, String, Keyword }

pub fn tokenize(input: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    // tokenization logic
    tokens
}`,

  "scripts/deploy.sh": `#!/bin/bash
set -e

echo "Building project..."
npm run build

echo "Running tests..."
npm test

echo "Deploying to production..."
rsync -avz dist/ server:/var/www/app/`,

  "scripts/setup.py": `import subprocess
import sys
import os

def setup():
    print("Installing dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    print("Setting up database...")
    os.system("psql -f scripts/migrate.sql")

if __name__ == "__main__":
    setup()`,

  "scripts/migrate.sql": `CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  stars INTEGER DEFAULT 0,
  language VARCHAR(50)
);

CREATE INDEX idx_repos_owner ON repositories(owner_id);`,

  "config/webpack.config.js": `const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  output: { path: path.resolve(__dirname, "../dist"), filename: "bundle.js" },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: {
    rules: [
      { test: /\\.tsx?$/, use: "ts-loader" },
      { test: /\\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
};`,

  "tests/app.test.tsx": `import { render, screen } from "@testing-library/react";
import { App } from "../src/app";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("Multi-Lang Demo")).toBeTruthy();
  });
});`,

  "tests/utils.test.ts": `import { formatDate, formatBytes } from "../src/utils/format";
import { validateEmail } from "../src/utils/validate";

describe("format", () => {
  it("formats bytes", () => { expect(formatBytes(1024)).toBe("1.0 KB"); });
});

describe("validate", () => {
  it("validates email", () => { expect(validateEmail("a@b.c")).toBe(true); });
});`,

  "plugins/Analyzer.java": `package plugins;

import java.util.List;
import java.util.ArrayList;

public class Analyzer {
    private List<String> findings;
    
    public Analyzer() { this.findings = new ArrayList<>(); }
    
    public void analyze(String code) {
        if (code.contains("eval(")) findings.add("Unsafe eval usage detected");
        if (code.contains("TODO")) findings.add("Unresolved TODO found");
    }
    
    public List<String> getFindings() { return findings; }
}`,

  "plugins/Reporter.java": `package plugins;

import java.io.PrintWriter;

public class Reporter {
    private Analyzer analyzer;
    
    public Reporter(Analyzer analyzer) { this.analyzer = analyzer; }
    
    public void generateReport(PrintWriter out) {
        out.println("=== Analysis Report ===");
        for (String finding : analyzer.getFindings()) {
            out.println("- " + finding);
        }
    }
}`,

  "tools/generator.rb": `require 'json'
require 'fileutils'

class Generator
  def initialize(config_path)
    @config = JSON.parse(File.read(config_path))
  end

  def generate
    @config['templates'].each do |template|
      FileUtils.mkdir_p(File.dirname(template['output']))
      File.write(template['output'], render(template))
    end
  end

  private

  def render(template)
    "// Generated from #{template['name']}"
  end
end`,

  "public/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multi-Lang Demo</title>
  <link rel="stylesheet" href="/styles/globals.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,

  "docs/guide.md": `# Getting Started

## Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Project Structure

The project uses a multi-language architecture:
- **Frontend**: React + TypeScript
- **Backend**: Node.js + Go microservices
- **Scripts**: Python + Shell automation
- **Plugins**: Java analyzers
- **Core**: Rust parser library`,

  "package.json": `{
  "name": "multi-lang-demo",
  "version": "2.4.1",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,

  "README.md": `# Multi-Lang Demo

A sample multi-language project demonstrating Odin's repository visualization capabilities.

## Languages Used
- TypeScript / React (frontend)
- Go (API microservice)
- Rust (parser library)
- Python (automation scripts)
- Java (analysis plugins)
- Ruby (code generation)
- SQL (database migrations)
- Shell (deployment scripts)
- CSS / SCSS (styling)

## Architecture
The project follows a modular architecture with clear separation of concerns.`,
};
