/**
 * Auto-Layout with Dagre
 *
 * Converts a React Flow graph into a hierarchical left-to-right layout.
 * Uses the Dagre library for automatic node positioning based on dependencies.
 */

import dagre from "dagre";
import type { Node as ReactFlowNode, Edge } from "@xyflow/react";

export interface LayoutOptions {
  direction?: "LR" | "TB"; // Left-to-Right or Top-to-Bottom
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number; // Separation between ranks (columns in LR)
  nodeSep?: number; // Separation between nodes in same rank
}

const defaultOptions: Required<LayoutOptions> = {
  direction: "LR",
  nodeWidth: 250,
  nodeHeight: 120,
  rankSep: 150,
  nodeSep: 80
};

/**
 * Applies Dagre layout algorithm to position React Flow nodes
 *
 * @param nodes - React Flow nodes (without positions or with old positions)
 * @param edges - React Flow edges (connections between nodes)
 * @param options - Layout configuration options
 * @returns Nodes with updated x/y positions
 *
 * Example:
 *   const layoutedNodes = getLayoutedNodes(nodes, edges, {
 *     direction: 'LR',
 *     nodeWidth: 250,
 *     nodeHeight: 120
 *   });
 */
export function getLayoutedNodes(nodes: ReactFlowNode[], edges: Edge[], options: LayoutOptions = {}): ReactFlowNode[] {
  const opts = { ...defaultOptions, ...options };

  // Create a new directed graph
  const graph = new dagre.graphlib.Graph();

  // Configure graph settings
  graph.setGraph({
    rankdir: opts.direction, // LR = left-to-right, TB = top-to-bottom
    ranksep: opts.rankSep, // Horizontal spacing between columns
    nodesep: opts.nodeSep, // Vertical spacing between nodes
    edgesep: 50, // Spacing between edges
    marginx: 50,
    marginy: 50
  });

  // Default edge configuration
  graph.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(graph);

  // Apply computed positions back to React Flow nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = graph.node(node.id);

    return {
      ...node,
      position: {
        // Dagre returns center coordinates, React Flow uses top-left
        // So we offset by half the node dimensions
        x: nodeWithPosition.x - opts.nodeWidth / 2,
        y: nodeWithPosition.y - opts.nodeHeight / 2
      }
    };
  });

  return layoutedNodes;
}

/**
 * Re-layouts the entire graph
 *
 * Convenience function that returns both nodes and edges.
 * Useful when you need to update the entire React Flow state.
 *
 * @param nodes - Current React Flow nodes
 * @param edges - Current React Flow edges
 * @param options - Layout configuration
 * @returns Object with layouted nodes and original edges
 */
export function getLayoutedElements(nodes: ReactFlowNode[], edges: Edge[], options: LayoutOptions = {}) {
  return {
    nodes: getLayoutedNodes(nodes, edges, options),
    edges
  };
}
