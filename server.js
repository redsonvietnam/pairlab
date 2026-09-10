import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(rootDir, 'public');
const dataFile = process.env.DATA_FILE || path.join(rootDir, 'data', 'tasks.json');
const port = Number(process.env.PORT || 3000);

async function readTasks() {
  try {
    const content = await fs.readFile(dataFile, 'utf8');
    const tasks = JSON.parse(content);
    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeTasks(tasks) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(tasks, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryFile, dataFile);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Invalid JSON');
    error.statusCode = 400;
    throw error;
  }
}

function validatePatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'request body must be an object';
  }

  const hasTitle = Object.hasOwn(body, 'title');
  const hasCompleted = Object.hasOwn(body, 'completed');
  if (!hasTitle && !hasCompleted) return 'title or completed is required';

  if (hasTitle && (typeof body.title !== 'string' || !body.title.trim())) {
    return 'title must be a non-empty string';
  }

  if (hasCompleted && typeof body.completed !== 'boolean') {
    return 'completed must be a boolean';
  }

  return null;
}

async function serveStatic(request, response, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8'
    };
    response.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream' });
    response.end(content);
  } catch (error) {
    sendJson(response, error.code === 'ENOENT' ? 404 : 500, { error: 'Not found' });
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);

    if (url.pathname === '/api/tasks' && request.method === 'GET') {
      sendJson(response, 200, await readTasks());
      return;
    }

    if (url.pathname === '/api/tasks' && request.method === 'POST') {
      const body = await readJson(request);
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) {
        sendJson(response, 400, { error: 'title is required' });
        return;
      }

      const tasks = await readTasks();
      const task = {
        id: randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString()
      };
      tasks.push(task);
      await writeTasks(tasks);
      sendJson(response, 201, task);
      return;
    }

    if (taskMatch && request.method === 'PATCH') {
      const taskId = decodeURIComponent(taskMatch[1]);
      const body = await readJson(request);
      const validationError = validatePatch(body);
      if (validationError) {
        sendJson(response, 400, { error: validationError });
        return;
      }

      const tasks = await readTasks();
      const index = tasks.findIndex((task) => task.id === taskId);
      if (index === -1) {
        sendJson(response, 404, { error: 'Task not found' });
        return;
      }

      const updatedTask = { ...tasks[index] };
      if (Object.hasOwn(body, 'title')) updatedTask.title = body.title.trim();
      if (Object.hasOwn(body, 'completed')) updatedTask.completed = body.completed;
      tasks[index] = updatedTask;
      await writeTasks(tasks);
      sendJson(response, 200, updatedTask);
      return;
    }

    if (taskMatch && request.method === 'DELETE') {
      const taskId = decodeURIComponent(taskMatch[1]);
      const tasks = await readTasks();
      const index = tasks.findIndex((task) => task.id === taskId);
      if (index === -1) {
        sendJson(response, 404, { error: 'Task not found' });
        return;
      }

      const [deletedTask] = tasks.splice(index, 1);
      await writeTasks(tasks);
      sendJson(response, 200, deletedTask);
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(request, response, url.pathname);
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, { error: error.message || 'Internal server error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => console.log(`PairLab Task Board: http://localhost:${port}`));
}

export { server, readTasks, writeTasks };
