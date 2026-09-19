import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESOLUTIONS,
  back,
  checkpoint,
  createNavigationState,
  focus,
  restoreCheckpoint,
  returnFromSideQuest,
  startSideQuest,
  zoomIn,
  zoomOut
} from '../src/navigation.js';

function initial() {
  return createNavigationState({ project: 'BAMSO', focus: 'UI', resolution: 'R2', view: 'graph' });
}

test('FOCUS changes focus without changing graph identity', () => {
  const graph = { nodes: [{ id: 'UI' }], edges: [] };
  const before = structuredClone(graph);
  const nav = focus(initial(), 'UI-02');
  assert.equal(nav.focus, 'UI-02');
  assert.deepEqual(graph, before);
});

test('ZOOM_IN increases resolution', () => {
  assert.equal(zoomIn(initial()).resolution, 'R3');
});

test('ZOOM_OUT decreases resolution', () => {
  assert.equal(zoomOut(initial()).resolution, 'R1');
});

test('ZOOM does not create meaningful history entries', () => {
  const nav = zoomIn(zoomOut(initial()));
  assert.deepEqual(nav.history, []);
});

test('FOCUS creates meaningful navigation history', () => {
  const nav = focus(initial(), 'UI-02');
  assert.deepEqual(nav.history, [{ focus: 'UI', resolution: 'R2', view: 'graph' }]);
});

test('BACK restores the previous meaningful focus without a fixed two-step rule', () => {
  const nav = focus(focus(focus(initial(), 'UI-02'), 'KEYBOARD'), 'C4');
  const once = back(nav);
  const twice = back(once);
  assert.equal(once.focus, 'KEYBOARD');
  assert.equal(twice.focus, 'UI-02');
  assert.equal(twice.history.length, 1);
});

test('side quest records its origin', () => {
  const nav = startSideQuest(focus(focus(initial(), 'UI-02'), 'KEYBOARD'), 'context');
  assert.deepEqual(nav.sideQuestOrigin, {
    project: 'BAMSO',
    focus: 'KEYBOARD',
    resolution: 'R2',
    view: 'context'
  });
});

test('RETURN restores the side-quest origin', () => {
  const origin = startSideQuest(focus(focus(initial(), 'UI-02'), 'KEYBOARD'));
  const quest = focus(focus(origin, 'C4'), 'STRUCTURIZR');
  const returned = returnFromSideQuest(quest);
  assert.equal(returned.project, 'BAMSO');
  assert.equal(returned.focus, 'KEYBOARD');
  assert.equal(returned.resolution, 'R2');
  assert.equal(returned.sideQuestOrigin, null);
});

test('CHECKPOINT captures and restores navigation context', () => {
  const saved = checkpoint(focus(initial(), 'UI-02'));
  const changed = zoomIn(focus(saved, 'KEYBOARD'));
  const restored = restoreCheckpoint(changed);
  assert.equal(restored.focus, 'UI-02');
  assert.equal(restored.resolution, 'R2');
  assert.equal(restored.history.length, 1);
});

test('context-loss scenario reconstructs BAMSO/UI-02/KEYBOARD after RETURN', () => {
  let nav = initial();
  nav = focus(nav, 'UI-02');
  nav = zoomIn(nav);
  nav = focus(nav, 'KEYBOARD');
  nav = startSideQuest(nav, 'context');
  nav = focus(nav, 'C4');
  nav = focus(nav, 'STRUCTURIZR');
  nav = returnFromSideQuest(nav);

  assert.equal(nav.project, 'BAMSO');
  assert.equal(nav.focus, 'KEYBOARD');
  assert.equal(nav.resolution, 'R3');
  assert.equal(nav.view, 'context');
  assert.equal(nav.sideQuestOrigin, null);
  assert.equal(nav.history.at(-1).focus, 'C4');
  assert.equal(nav.history.at(-2).focus, 'KEYBOARD');
});

test('BACK and RETURN have different semantics', () => {
  let nav = startSideQuest(focus(focus(initial(), 'UI-02'), 'KEYBOARD'));
  nav = focus(nav, 'C4');
  assert.equal(back(nav).focus, 'KEYBOARD');
  assert.equal(returnFromSideQuest(nav).focus, 'KEYBOARD');
  assert.notDeepEqual(back(nav), returnFromSideQuest(nav));
  assert.equal(returnFromSideQuest(nav).sideQuestOrigin, null);
  assert.equal(back(nav).sideQuestOrigin.focus, 'KEYBOARD');
});

test('navigation state changes do not mutate the underlying graph model', () => {
  const graph = {
    nodes: [{ id: 'UI', label: 'UI' }, { id: 'UI-02', label: 'UI-02' }],
    edges: []
  };
  const snapshot = structuredClone(graph);
  let nav = initial();
  nav = focus(nav, 'UI-02');
  nav = zoomIn(nav);
  nav = startSideQuest(nav);
  nav = focus(nav, 'C4');
  nav = checkpoint(nav);
  nav = returnFromSideQuest(nav);
  assert.deepEqual(graph, snapshot);
});

test('resolution boundaries are deterministic', () => {
  let nav = createNavigationState({ project: 'BAMSO', focus: 'UI', resolution: 'R0' });
  nav = zoomOut(nav);
  assert.equal(nav.resolution, 'R0');
  nav = { ...nav, resolution: 'R4' };
  nav = zoomIn(nav);
  assert.equal(nav.resolution, 'R4');
  assert.deepEqual(RESOLUTIONS, ['R0', 'R1', 'R2', 'R3', 'R4']);
});
