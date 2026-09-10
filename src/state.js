export function createInitialState() {
  return {
    nodes: [],
    edges: []
  };
}

export function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('State must be an object');
  }
  if (!Array.isArray(state.nodes) || !Array.isArray(state.edges)) {
    throw new Error('State must contain nodes and edges arrays');
  }

  for (const node of state.nodes) {
    if (!node || typeof node !== 'object' ||
        typeof node.id !== 'string' ||
        typeof node.type !== 'string' ||
        typeof node.label !== 'string' ||
        typeof node.status !== 'string') {
      throw new Error('Invalid node');
    }
  }

  for (const edge of state.edges) {
    if (!edge || typeof edge !== 'object' ||
        typeof edge.id !== 'string' ||
        typeof edge.source !== 'string' ||
        typeof edge.target !== 'string' ||
        typeof edge.type !== 'string') {
      throw new Error('Invalid edge');
    }
  }

  return state;
}

export function addNode(state, input) {
  validateState(state);
  if (!input || typeof input !== 'object') throw new Error('Node input required');

  const node = {
    id: String(input.id ?? ''),
    type: String(input.type ?? 'task'),
    label: String(input.label ?? ''),
    status: String(input.status ?? 'proposed')
  };

  if (!node.id || !node.label) throw new Error('Node id and label are required');
  if (state.nodes.some((existing) => existing.id === node.id)) {
    throw new Error(`Node already exists: ${node.id}`);
  }

  return {
    ...state,
    nodes: [...state.nodes, node],
    edges: [...state.edges]
  };
}
