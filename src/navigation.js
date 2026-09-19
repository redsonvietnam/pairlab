export const RESOLUTIONS = ['R0', 'R1', 'R2', 'R3', 'R4'];

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function createNavigationState({ project, focus, resolution = 'R2', view = 'graph' }) {
  if (!project || !focus) throw new Error('project and focus are required');
  if (!RESOLUTIONS.includes(resolution)) throw new Error('Invalid resolution');

  return {
    project,
    focus,
    resolution,
    view,
    history: [],
    sideQuestOrigin: null,
    checkpoint: null
  };
}

export function resolveNode(graphState, nodeId) {
  if (!graphState || !Array.isArray(graphState.nodes)) {
    throw new Error('Graph state with nodes is required');
  }
  const node = graphState.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  return clone(node);
}

export function focus(state, node) {
  if (!node) throw new Error('focus node is required');
  if (node === state.focus) return clone(state);
  return {
    ...clone(state),
    focus: node,
    history: [...state.history, { focus: state.focus, resolution: state.resolution, view: state.view }]
  };
}

export function focusNode(state, graphState, nodeId) {
  resolveNode(graphState, nodeId);
  return focus(state, nodeId);
}

export function zoomIn(state) {
  const index = RESOLUTIONS.indexOf(state.resolution);
  if (index < 0 || index >= RESOLUTIONS.length - 1) return clone(state);
  return { ...clone(state), resolution: RESOLUTIONS[index + 1] };
}

export function zoomOut(state) {
  const index = RESOLUTIONS.indexOf(state.resolution);
  if (index <= 0) return clone(state);
  return { ...clone(state), resolution: RESOLUTIONS[index - 1] };
}

export function back(state) {
  if (state.history.length === 0) return clone(state);
  const history = [...state.history];
  const previous = history.pop();
  return {
    ...clone(state),
    focus: previous.focus,
    resolution: previous.resolution,
    view: previous.view,
    history
  };
}

export function startSideQuest(state, originView = state.view) {
  return {
    ...clone(state),
    sideQuestOrigin: {
      project: state.project,
      focus: state.focus,
      resolution: state.resolution,
      view: originView
    }
  };
}

export function returnFromSideQuest(state) {
  if (!state.sideQuestOrigin) return clone(state);
  const origin = state.sideQuestOrigin;
  return {
    ...clone(state),
    project: origin.project,
    focus: origin.focus,
    resolution: origin.resolution,
    view: origin.view,
    sideQuestOrigin: null
  };
}

export function checkpoint(state) {
  return { ...clone(state), checkpoint: {
    project: state.project,
    focus: state.focus,
    resolution: state.resolution,
    view: state.view,
    history: clone(state.history),
    sideQuestOrigin: clone(state.sideQuestOrigin)
  }};
}

export function restoreCheckpoint(state) {
  if (!state.checkpoint) return clone(state);
  const saved = state.checkpoint;
  return {
    ...clone(state),
    project: saved.project,
    focus: saved.focus,
    resolution: saved.resolution,
    view: saved.view,
    history: clone(saved.history),
    sideQuestOrigin: clone(saved.sideQuestOrigin)
  };
}
