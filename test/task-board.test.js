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

test('GET and POST tasks use persistent storage across process restart', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pairlab-'));
  const dataFile = path.join(directory, 'tasks.json');
  const port = 34000 + Math.floor(Math.random() * 1000);
  let server = startServer(dataFile, port);

  t.after(async () => {
    await stopServer(server.child);
    await rm(directory, { recursive: true, force: true });
  });

  await server.ready;

  const initial = await request(port, '/api/tasks');
  assert.equal(initial.status, 200);
  assert.deepEqual(await initial.json(), []);

  const created = await request(port, '/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Verify vertical slice' })
  });
  assert.equal(created.status, 201);
  const task = await created.json();
  assert.equal(task.title, 'Verify vertical slice');
  assert.equal(task.completed, false);
  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.ok(task.createdAt);

  await stopServer(server.child);
  server = startServer(dataFile, port);
  await server.ready;

  const afterRestart = await request(port, '/api/tasks');
  assert.equal(afterRestart.status, 200);
  assert.deepEqual(await afterRestart.json(), [task]);
});

test('POST rejects an empty title', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pairlab-'));
  const dataFile = path.join(directory, 'tasks.json');
  const port = 35000 + Math.floor(Math.random() * 1000);
  const server = startServer(dataFile, port);
  t.after(async () => {
    await stopServer(server.child);
    await rm(directory, { recursive: true, force: true });
  });
  await server.ready;

  const response = await request(port, '/api/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: '   ' })
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'title is required');
});
