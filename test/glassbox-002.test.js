import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addNode, createInitialState } from '../src/state.js';
import { loadState, saveState } from '../src/persistence.js';
import { toGraphModel } from '../src/model.js';
import { createGlassboxServer } from '../server.js';

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'glassbox-002-'));
  return join(dir, 'state.json');
}

async function runningServer(dataFile) {
  const server = await createGlassboxServer({ dataFile });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

test('initial state is independent of renderer representation', () => {
  const state = createInitialState();
  assert.deepEqual(state, { nodes: [], edges: [] });
  assert.equal(Object.hasOwn(state, 'position'), false);
});

test('ADD_NODE creates a new state without mutating the old state', () => {
  const before = createInitialState();
  const after = addNode(before, { id: 'n1', type: 'task', label: 'First', status: 'proposed' });
  assert.deepEqual(before.nodes, []);
  assert.equal(after.nodes[0].id, 'n1');
  assert.equal(after.nodes[0].label, 'First');
});

test('state persistence survives a fresh load', async () => {
  const file = await fixture();
  const state = addNode(createInitialState(), { id: 'n1', type: 'task', label: 'Persisted', status: 'proposed' });
  await saveState(file, state);
  assert.deepEqual(await loadState(file), state);
  assert.match(await readFile(file, 'utf8'), /"nodes"/);
});

test('state to graphModel is a pure derived projection', () => {
  const state = addNode(createInitialState(), { id: 'n1', type: 'task', label: 'First', status: 'proposed' });
  const model = toGraphModel(state);
  assert.notStrictEqual(model.nodes, state.nodes);
  assert.equal(model.nodes[0].id, 'n1');
  assert.equal(model.nodes[0].data.label, 'First');
  assert.deepEqual(state.nodes[0], { id: 'n1', type: 'task', label: 'First', status: 'proposed' });
  assert.equal(Object.hasOwn(model.nodes[0], 'position'), true);
});

test('reload reconstructs the same world from persisted state', async () => {
  const file = await fixture();
  const first = addNode(createInitialState(), { id: 'n1', type: 'task', label: 'Survives reload', status: 'proposed' });
  await saveState(file, first);

  const reloadedState = await loadState(file);
  const reconstructedModel = toGraphModel(reloadedState);
  assert.equal(reconstructedModel.nodes[0].id, 'n1');
  assert.equal(reconstructedModel.nodes[0].data.label, 'Survives reload');
});

test('HTTP mutation persists state and GET reconstructs the graph', async (t) => {
  const file = await fixture();
  const { server, base } = await runningServer(file);
  t.after(() => server.close());

  const initial = await fetch(`${base}/api/state`).then((r) => r.json());
  assert.deepEqual(initial, { nodes: [], edges: [] });

  const created = await fetch(`${base}/api/nodes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'n1', type: 'task', label: 'HTTP node', status: 'proposed' })
  }).then((r) => r.json());
  assert.equal(created.nodes.length, 1);

  const reloaded = await fetch(`${base}/api/state`).then((r) => r.json());
  const model = await fetch(`${base}/api/graph-model`).then((r) => r.json());
  assert.deepEqual(reloaded, created);
  assert.equal(model.nodes[0].id, 'n1');
  assert.equal(model.nodes[0].data.label, 'HTTP node');
});
