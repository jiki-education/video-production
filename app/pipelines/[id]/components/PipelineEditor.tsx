/**
 * Pipeline Editor Client Component
 *
 * Main container that manages state and coordinates between FlowCanvas and EditorPanel.
 * Uses optimistic updates for instant UI feedback without page refreshes.
 */

"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Node as ReactFlowNode, Edge } from "@xyflow/react";
import type { Node } from "@/lib/nodes/types";
import type { Pipeline } from "@/lib/types";
import FlowCanvas from "./FlowCanvas";
import EditorPanel from "./EditorPanel";
import { getLayoutedNodes } from "@/lib/layout";
import { connectNodesAction, deleteNodeAction } from "../actions";
import { getOutputHandleColorValue } from "@/lib/nodes/display-helpers";

interface PipelineEditorProps {
  pipeline: Pipeline;
  nodes: Node[];
}

export default function PipelineEditor({ pipeline, nodes: initialNodes }: PipelineEditorProps) {
  const router = useRouter();

  // Local state - source of truth for UI
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Store node positions separately to prevent re-layout
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const hasInitialLayout = useRef(false);

  // Find the selected node
  const selectedNode =
    selectedNodeId != null && selectedNodeId !== "" ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null;

  // Convert domain nodes to React Flow nodes
  const reactFlowNodes: ReactFlowNode[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: 0, y: 0 }, // Will be set by layout or preserved position
      data: {
        node,
        onSelect: () => setSelectedNodeId(node.id)
      },
      selected: node.id === selectedNodeId
    }));
  }, [nodes, selectedNodeId]);

  // Convert node inputs to React Flow edges
  const edges: Edge[] = useMemo(() => {
    const edgesList: Edge[] = [];

    nodes.forEach((node) => {
      Object.entries(node.inputs).forEach(([inputKey, sources]) => {
        // All inputs are arrays now
        if (Array.isArray(sources)) {
          sources.forEach((sourceId, index) => {
            // Find the source node to get its output color
            const sourceNode = nodes.find((n) => n.id === sourceId);
            const edgeColor = sourceNode != null ? getOutputHandleColorValue(sourceNode) : "#9ca3af";

            // Determine if line should be dashed (pending/in_progress/failed) or solid (completed)
            // Check the SOURCE node's status since the edge represents its output
            const isDashed = sourceNode != null ? sourceNode.status !== "completed" : true;

            edgesList.push({
              id: `${sourceId}-${node.id}-${inputKey}-${index}`,
              source: sourceId,
              target: node.id,
              targetHandle: inputKey,
              animated: node.status === "in_progress",
              style: {
                stroke: edgeColor,
                strokeWidth: 2,
                strokeDasharray: isDashed ? "5,5" : "0"
              }
            });
          });
        }
      });
    });

    return edgesList;
  }, [nodes]);

  // Apply positions to nodes (auto-layout only on first render)
  const layoutedNodes = useMemo(() => {
    // If we already have positions for all nodes, use them
    const allNodesHavePositions = reactFlowNodes.every((node) => nodePositions[node.id] != null);

    if (allNodesHavePositions && hasInitialLayout.current) {
      // Preserve existing positions
      return reactFlowNodes.map((node) => ({
        ...node,
        position: nodePositions[node.id] ?? { x: 0, y: 0 }
      }));
    }

    // Calculate node dimensions from measured heights (if available)
    const haveMeasuredDimensions = reactFlowNodes.some((n) => n.measured?.height != null && n.measured.height !== 0);
    const maxHeight = haveMeasuredDimensions
      ? Math.max(
          ...reactFlowNodes.map((n) =>
            n.measured?.height != null && n.measured.height !== 0 ? n.measured.height : 240
          ),
          240
        )
      : 240;

    const maxWidth = haveMeasuredDimensions
      ? Math.max(
          ...reactFlowNodes.map((n) => (n.measured?.width != null && n.measured.width !== 0 ? n.measured.width : 280)),
          280
        )
      : 280;

    // First render: run auto-layout with Dagre
    const layouted = getLayoutedNodes(reactFlowNodes, edges, {
      direction: "LR",
      nodeWidth: maxWidth,
      nodeHeight: maxHeight,
      rankSep: 150,
      nodeSep: 50 // Spacing between nodes vertically
    });

    // Save positions for future renders
    const positions: Record<string, { x: number; y: number }> = {};
    layouted.forEach((node) => {
      positions[node.id] = node.position;
    });
    setNodePositions(positions);
    hasInitialLayout.current = true;

    return layouted;
  }, [reactFlowNodes, edges, nodePositions]);

  // Manual re-layout function
  const handleRelayout = useCallback(() => {
    // Force re-layout by clearing positions
    setNodePositions({});
    hasInitialLayout.current = false;
  }, []);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Handle connecting nodes with optimistic update
  const handleConnect = useCallback(
    async (sourceId: string, targetId: string, targetHandle: string) => {
      // OPTIMISTIC UPDATE: Update UI immediately
      const previousNodes = nodes;

      setNodes((prevNodes) => {
        return prevNodes.map((node) => {
          if (node.id === targetId) {
            // Get current array (or empty array if doesn't exist)
            const currentValue = (node.inputs as Record<string, string[]>)[targetHandle] ?? [];

            // Check if already connected
            if (currentValue.includes(sourceId)) {
              return node; // Already connected, no change
            }

            // Append to array
            const newValue = [...currentValue, sourceId];

            // Update the target node's inputs (preserving discriminated union)
            return {
              ...node,
              inputs: {
                ...node.inputs,
                [targetHandle]: newValue
              }
            } as Node;
          }
          return node;
        });
      });

      setIsSaving(true);

      // BACKGROUND: Persist to database
      const result = await connectNodesAction(pipeline.id, sourceId, targetId, targetHandle);

      setIsSaving(false);

      if (!result.success) {
        // ROLLBACK: Restore previous state on error
        alert(`Failed to connect nodes: ${result.error}`);
        setNodes(previousNodes);
      }
    },
    [pipeline.id, nodes]
  );

  // Handle deleting nodes with optimistic update
  const handleNodesDelete = useCallback(
    async (nodeIds: string[]) => {
      // OPTIMISTIC UPDATE: Remove nodes from UI immediately
      const previousNodes = nodes;
      const previousPositions = nodePositions;

      setNodes((prevNodes) => {
        // Remove deleted nodes
        let updated = prevNodes.filter((node) => !nodeIds.includes(node.id));

        // Clean up references in remaining nodes' inputs
        updated = updated.map((node) => {
          const cleanedInputs = { ...node.inputs } as Record<string, string[]>;
          let modified = false;

          Object.entries(cleanedInputs).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              const filtered = value.filter((id) => !nodeIds.includes(id));
              if (filtered.length !== value.length) {
                cleanedInputs[key] = filtered;
                modified = true;
              }
            }
          });

          return modified ? ({ ...node, inputs: cleanedInputs } as Node) : node;
        });

        return updated;
      });

      // Remove positions for deleted nodes
      setNodePositions((prev) => {
        const updated = { ...prev };
        nodeIds.forEach((id) => delete updated[id]);
        return updated;
      });

      // Deselect if deleted node was selected
      if (selectedNodeId != null && selectedNodeId !== "" && nodeIds.includes(selectedNodeId)) {
        setSelectedNodeId(null);
      }

      setIsSaving(true);

      // BACKGROUND: Persist to database
      let hasError = false;
      for (const nodeId of nodeIds) {
        const result = await deleteNodeAction(pipeline.id, nodeId);

        if (!result.success) {
          alert(`Failed to delete node ${nodeId}: ${result.error}`);
          hasError = true;
          break;
        }
      }

      setIsSaving(false);

      if (hasError) {
        // ROLLBACK: Restore previous state on error
        setNodes(previousNodes);
        setNodePositions(previousPositions);
        if (selectedNodeId != null && selectedNodeId !== "" && nodeIds.includes(selectedNodeId)) {
          setSelectedNodeId(selectedNodeId); // Restore selection
        }
      }
    },
    [pipeline.id, nodes, nodePositions, selectedNodeId]
  );

  // Handle delete from editor panel
  const handleDeleteFromPanel = useCallback(
    async (nodeId: string) => {
      await handleNodesDelete([nodeId]);
    },
    [handleNodesDelete]
  );

  // Manual refresh from database
  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          Saving...
        </div>
      )}

      {/* Control buttons */}
      <div className="absolute top-4 right-[25rem] z-50 flex gap-2">
        <button
          onClick={handleRefresh}
          className="bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded shadow text-sm font-medium text-gray-700 transition-colors"
          title="Refresh from database (sync execution state)"
        >
          🔄 Refresh
        </button>
        <button
          onClick={handleRelayout}
          className="bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded shadow text-sm font-medium text-gray-700 transition-colors"
          title="Re-run auto-layout"
        >
          ⚡ Re-layout
        </button>
      </div>

      {/* Flow Canvas */}
      <FlowCanvas
        nodes={layoutedNodes}
        edges={edges}
        selectedNodeId={selectedNodeId}
        onNodeSelect={handleNodeSelect}
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
      />

      {/* Editor Panel */}
      <EditorPanel selectedNode={selectedNode} pipelineId={pipeline.id} onDelete={handleDeleteFromPanel} />
    </div>
  );
}
