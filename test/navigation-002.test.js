import test from 'node:test';
import assert from 'node:assert/strict';
import {
  back,
  createNavigationState,
  focusNode,
  resolveNode,
  returnFromSideQuest,
  startSideQuest
} from '../src/navigation.js';
import { addNode, createInitialState } from '../src/state.js';
import { toGraphModel } from '../src/model.js';

function graphModel() {
  let state = createInitialState();
  state = addNode(state, { id: 'UI', type: 'task', label: 'UI', status: 'proposed' });
  state = addNode(state, { id: 'UI-02', type: 'task', label: 'UI-02', status: 'proposed' });
  state = addNode(state, { id: 'KEYBOARD', type: 'task', label: 'Keyboard', status: 'proposed' });
  state = addNode(state, { id: 'C4', type: 'task', label: 'C4', status: 'proposed' });
  return toGraphModel(state);
}

function initialNavigation() {
  return createNavigationState({ project: 'BAMSO', focus: 'UI', resolution: 'R2', view: 'graph' });
}

test('FOCUS resolves an actual node from the pure graph model by stable ID', () => {
  const graph = graphModel();
  const resolved = resolveNode(graph, 'UI-02');

  assert.equal(resolved.id, 'UI-02');
  assert.equal(resolved.data.label, 'UI-02');
});

test('FOCUS rejects a node ID that is not present in the graph', () => {
  const graph = graphModel();

  assert.throws(
    () => resolveNode(graph, 'NOT-IN-GRAPH'),
    /Node not found: NOT-IN-GRAPH/
  );
  assert.throws(
    () => focusNode(initialNavigation(), graph, 'NOT-IN-GRAPH'),
    /Node not found: NOT-IN-GRAPH/
  );
});

test('graph-bound FOCUS stores identity, not the graph node object', () => {
  const graph = graphModel();
  const nav = focusNode(initialNavigation(), graph, 'UI-02');

  assert.equal(nav.focus, 'UI-02');
  assert.equal(Object.hasOwn(nav, 'nodes'), false);
  assert.equal(Object.hasOwn(nav, 'data'), false);
});

test('navigation cannot mutate the graph through resolved node references', () => {
  const graph = graphModel();
  const graphSnapshot = structuredClone(graph);
  const resolved = resolveNode(graph, 'UI-02');

  resolved.data.label = 'mutated outside graph';
  const nav = focusNode(initialNavigation(), graph, 'UI-02');

  assert.equal(nav.focus, 'UI-02');
  assert.deepEqual(graph, graphSnapshot);
});

test('graph-bound FOCUS itself does not mutate the graph model', () => {
  const graph = graphModel();
  const graphSnapshot = structuredClone(graph);

  const nav = focusNode(initialNavigation(), graph, 'KEYBOARD');

  assert.equal(nav.focus, 'KEYBOARD');
  assert.deepEqual(graph, graphSnapshot);
});

test('graph mutation remains outside navigation transitions', () => {
  let graphState = createInitialState();
  graphState = addNode(graphState, { id: 'UI', type: 'task', label: 'UI', status: 'proposed' });
  const before = graphState;

  const graphWithChild = addNode(graphState, {
    id: 'UI-02',
    type: 'task',
    label: 'UI-02',
    status: 'proposed'
  });

  const nav = focusNode(
    initialNavigation(),
    toGraphModel(graphWithChild),
    'UI-02'
  );

  assert.equal(nav.focus, 'UI-02');
  assert.equal(before.nodes.length, 1);
  assert.equal(graphWithChild.nodes.length, 2);
});

test('BACK remains meaningful after graph-bound FOCUS', () => {
  const graph = graphModel();
  let nav = focusNode(initialNavigation(), graph, 'UI-02');
  nav = focusNode(nav, graph, 'KEYBOARD');

  const returned = back(nav);

  assert.equal(returned.focus, 'UI-02');
  assert.equal(returned.history.length, 1);
});

test('RETURN remains distinct from BACK with graph-bound focus', () => {
  const graph = graphModel();
  let nav = focusNode(initialNavigation(), graph, 'UI-02');
  nav = focusNode(nav, graph, 'KEYBOARD');
  nav = startSideQuest(nav);
  nav = focusNode(nav, graph, 'C4');

  const viaBack = back(nav);
  const viaReturn = returnFromSideQuest(nav);

  assert.equal(viaBack.focus, 'KEYBOARD');
  assert.equal(viaReturn.focus, 'KEYBOARD');
  assert.equal(viaBack.sideQuestOrigin.focus, 'KEYBOARD');
  assert.equal(viaReturn.sideQuestOrigin, null);
});
