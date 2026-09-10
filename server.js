import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addNode } from './src/state.js';
import { loadState, saveState } from './src/persistence.js';
import { toGraphModel } from './src/model.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA_FILE = process.env.DATA_FILE || join(ROOT, 'data', 'glassbox-state.json');

const json = (res, status, value) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
};

async function body(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

export async function createGlassboxServer({ dataFile = DATA_FILE } = {}) {
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/api/state' && req.method === 'GET') {
        return json(res, 200, await loadState(dataFile));
      }

      if (req.url === '/api/graph-model' && req.method === 'GET') {
        const state = await loadState(dataFile);
        return json(res, 200, toGraphModel(state));
      }

      if (req.url === '/api/nodes' && req.method === 'POST') {
        const state = await loadState(dataFile);
        const nextState = addNode(state, await body(req));
        await saveState(dataFile, nextState);
        return json(res, 201, nextState);
      }

      if (req.method === 'GET') {
        const requested = req.url === '/' ? '/index.html' : req.url;
        const safe = normalize(requested).replace(/^([.][.][/\\])+/, '');
        const file = join(PUBLIC, safe);
        const content = await readFile(file);
        res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
        return res.end(content);
      }

      return json(res, 404, { error: 'Not found' });
    } catch (error) {
      const status = error.message?.includes('required') || error.message?.includes('already exists') ? 400 : 500;
      return json(res, status, { error: error.message });
    }
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await createGlassboxServer();
  server.listen(Number(process.env.PORT || 3000), () => {
    console.log(`Glassbox listening on http://localhost:${process.env.PORT || 3000}`);
  });
}
