import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(rootDir, '..', 'server.js');

function startServer(dataFile, port) {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: String(port), DATA_FILE: dataFile },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const ready = new Promise((resolve, reject) => {
    let output = '';
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes('PairLab Task Board:')) {
        child.stdout.off('data', onData);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code !== 0) reject(new Error(`server exited before ready: ${code}`));
    });
  });

  return { child, ready };
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  });
}

async function request(port, pathname, options) {
  return fetch(`http://127.0.0.1:${port}${pathname}`, options);
}

function jsonOptions(method, body) {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}

async function createTestServer(t, portOffset = 0) {
  const directory = await mkdtemp(path.join(tmpdir(), 'pairlab-'));
  const dataFile = path.join(directory, 'tasks.json');
  const port = 34000 + portOffset + Math.floor(Math.random() * 500);
  let server = startServer(dataFile, port);

  t.after(async () => {
    await stopServer(server.child);
    await rm(directory, { recursive: true, force: true });
  });

  await server.ready;
  return {
    port,
    dataFile,
    restart: async () => {
      await stopServer(server.child);
      server = startServer(dataFile, port);
      await server.ready;
    }
  };
}

test('GET returns existing tasks', async (t) => {
  const { port } = await createTestServer(t);

  const response = await request(port, '/api/tasks');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('POST creates a task', async (t) => {
  const { port } = await createTestServer(t, 1000);

  const response = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Create me' }));
  assert.equal(response.status, 201);
  const task = await response.json();
  assert.equal(task.title, 'Create me');
  assert.equal(task.completed, false);
  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.ok(task.createdAt);
});

test('PATCH completed=true updates task', async (t) => {
  const { port } = await createTestServer(t, 2000);
  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Toggle me' }));
  const task = await created.json();

  const response = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', { completed: true }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ...task, completed: true });
});

test('PATCH completed=false toggles task back', async (t) => {
  const { port } = await createTestServer(t, 3000);
  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Toggle back' }));
  const task = await created.json();
  await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', { completed: true }));

  const response = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', { completed: false }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), task);
});

test('PATCH title updates task title', async (t) => {
  const { port } = await createTestServer(t, 4000);
  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Old title' }));
  const task = await created.json();

  const response = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', { title: 'New title' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ...task, title: 'New title' });
});

test('PATCH rejects an invalid title', async (t) => {
  const { port } = await createTestServer(t, 5000);
  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Keep me' }));
  const task = await created.json();

  const response = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', { title: '   ' }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'title must be a non-empty string');
});

test('PATCH nonexistent task returns 404', async (t) => {
  const { port } = await createTestServer(t, 6000);

  const response = await request(port, '/api/tasks/not-a-real-task', jsonOptions('PATCH', { completed: true }));
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'Task not found');
});

test('DELETE removes a task', async (t) => {
  const { port } = await createTestServer(t, 7000);
  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Delete me' }));
  const task = await created.json();

  const response = await request(port, `/api/tasks/${task.id}`, { method: 'DELETE' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), task);

  const list = await request(port, '/api/tasks');
  assert.deepEqual(await list.json(), []);
});

test('DELETE nonexistent task returns 404', async (t) => {
  const { port } = await createTestServer(t, 8000);

  const response = await request(port, '/api/tasks/not-a-real-task', { method: 'DELETE' });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'Task not found');
});

test('CRUD changes persist after process restart', async (t) => {
  const { port, restart } = await createTestServer(t, 9000);

  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Persist this' }));
  const task = await created.json();
  const updated = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', {
    title: 'Persisted update',
    completed: true
  }));
  assert.equal(updated.status, 200);
  const updatedTask = await updated.json();

  const other = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Delete before restart' }));
  const otherTask = await other.json();
  const deleted = await request(port, `/api/tasks/${otherTask.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);

  await restart();

  const afterRestart = await request(port, '/api/tasks');
  assert.equal(afterRestart.status, 200);
  assert.deepEqual(await afterRestart.json(), [updatedTask]);
});

test('POST rejects an empty title and malformed JSON', async (t) => {
  const { port } = await createTestServer(t, 10000);

  const emptyTitle = await request(port, '/api/tasks', jsonOptions('POST', { title: '   ' }));
  assert.equal(emptyTitle.status, 400);
  assert.equal((await emptyTitle.json()).error, 'title is required');

  const malformed = await request(port, '/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid'
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'Invalid JSON');
});

test('PATCH rejects invalid completed value and empty patch', async (t) => {
  const { port } = await createTestServer(t, 11000);
  const created = await request(port, '/api/tasks', jsonOptions('POST', { title: 'Validate patch' }));
  const task = await created.json();

  const invalidCompleted = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', { completed: 'true' }));
  assert.equal(invalidCompleted.status, 400);
  assert.equal((await invalidCompleted.json()).error, 'completed must be a boolean');

  const emptyPatch = await request(port, `/api/tasks/${task.id}`, jsonOptions('PATCH', {}));
  assert.equal(emptyPatch.status, 400);
  assert.equal((await emptyPatch.json()).error, 'title or completed is required');
});
