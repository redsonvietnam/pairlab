function renderGraph(graphModel) {
  const graph = document.querySelector('#graph');
  graph.replaceChildren();

  for (const node of graphModel.nodes) {
    const element = document.createElement('article');
    element.className = 'node';
    element.dataset.nodeId = node.id;
    element.innerHTML = `<strong></strong><small></small>`;
    element.querySelector('strong').textContent = node.data.label;
    element.querySelector('small').textContent = `${node.data.nodeType} · ${node.data.status}`;
    graph.append(element);
  }

  document.querySelector('#status').textContent =
    `${graphModel.metadata.nodeCount} node(s), ${graphModel.metadata.edgeCount} edge(s) — rendered from persisted state`;
}

async function loadAndRender() {
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error('Failed to load state');
  const state = await response.json();
  const modelResponse = await fetch('/api/graph-model');
  if (!modelResponse.ok) throw new Error('Failed to load graph model');
  renderGraph(await modelResponse.json());
  return state;
}

document.querySelector('#add-node').addEventListener('click', async () => {
  const id = `node-${Date.now()}`;
  const response = await fetch('/api/nodes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, type: 'task', label: `Node ${id.slice(-4)}`, status: 'proposed' })
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Failed to add node');
  await loadAndRender();
});

loadAndRender().catch((error) => {
  document.querySelector('#status').textContent = error.message;
});
