export function toGraphModel(state) {
  return {
    nodes: state.nodes.map((node, index) => ({
      id: node.id,
      type: 'default',
      position: { x: 80 + index * 180, y: 120 },
      data: {
        label: node.label,
        nodeType: node.type,
        status: node.status
      }
    })),
    edges: state.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'default'
    })),
    metadata: {
      nodeCount: state.nodes.length,
      edgeCount: state.edges.length
    }
  };
}
