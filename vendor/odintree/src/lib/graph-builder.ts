import { Node, Edge } from "@xyflow/react";
import { RepoFile } from "./github";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  language?: string;
  size?: number;
  children: TreeNode[];
}

function buildTreeStructure(files: RepoFile[]): TreeNode {
  const root: TreeNode = { name: "root", path: "", type: "dir", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          type: isLast ? file.type : "dir",
          language: isLast ? file.language : undefined,
          size: isLast ? file.size : undefined,
          children: [],
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  return root;
}

function getSubtreeHeight(node: TreeNode, nodeH: number, gapY: number): number {
  const visibleChildren = node.children.slice(0, 30);
  if (visibleChildren.length === 0) return nodeH;
  let totalHeight = 0;
  for (const child of visibleChildren) {
    totalHeight += getSubtreeHeight(child, nodeH, gapY);
  }
  totalHeight += (visibleChildren.length - 1) * gapY;
  return Math.max(nodeH, totalHeight);
}

function getEdgeLabel(parent: TreeNode, child: TreeNode): string | undefined {
  if (child.type === "dir") return "contains";
  if (child.language && child.language !== "Other") return child.language.toLowerCase();
  const ext = child.name.split(".").pop();
  if (ext) return `.${ext}`;
  return undefined;
}

function layoutTree(
  node: TreeNode,
  nodes: Node[],
  edges: Edge[],
  x: number,
  y: number,
  nodeH: number,
  gapX: number,
  gapY: number,
  parentId?: string,
  parentNode?: TreeNode
) {
  const id = node.path || "repo-root";

  nodes.push({
    id,
    type: "graphNode",
    position: { x, y },
    data: {
      label: node.name,
      path: node.path,
      language: node.language || "Other",
      nodeType: node.type,
      size: node.size,
      childCount: node.type === "dir" ? node.children.length : undefined,
    },
  });

  if (parentId && parentNode) {
    const label = getEdgeLabel(parentNode, node);
    edges.push({
      id: `${parentId}->${id}`,
      source: parentId,
      target: id,
      type: "default",
      animated: false,
      label: label,
      labelStyle: { fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "Inter, sans-serif" },
      labelBgStyle: { fill: "hsl(var(--background))", fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      style: { stroke: "hsl(var(--border))", strokeWidth: 2, strokeLinecap: "round" },
    });
  }

  const visibleChildren = node.children;
  if (visibleChildren.length === 0) return;

  const childHeights = visibleChildren.map((c) => getSubtreeHeight(c, nodeH, gapY));
  const totalHeight = childHeights.reduce((a, b) => a + b, 0) + (visibleChildren.length - 1) * gapY;
  let cy = y - totalHeight / 2 + nodeH / 2;

  for (let i = 0; i < visibleChildren.length; i++) {
    const childY = cy + childHeights[i] / 2 - nodeH / 2;
    layoutTree(visibleChildren[i], nodes, edges, x + gapX, childY, nodeH, gapX, gapY, id, node);
    cy += childHeights[i] + gapY;
  }
}

export function buildGraphFromFiles(
  files: RepoFile[],
  repoName?: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const tree = buildTreeStructure(files.filter((f) => f.type === "file"));

  tree.name = repoName || "Repository";
  tree.path = "";

  const NODE_H = 56;
  const GAP_X = 500;
  const GAP_Y = 80;

  layoutTree(tree, nodes, edges, 0, 0, NODE_H, GAP_X, GAP_Y);

  return { nodes, edges };
}
