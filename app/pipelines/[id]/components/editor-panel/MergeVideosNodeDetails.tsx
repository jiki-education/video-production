/**
 * Merge Videos Node Details Component
 *
 * Specialized detail view for merge-videos nodes with drag-and-drop segment reordering.
 */

"use client";

import { useState, useMemo } from "react";
import type { MergeVideosNode, Node } from "@/lib/nodes/types";
import { reorderNodeInputs } from "@/lib/api-client";
import { DndContext, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface MergeVideosNodeDetailsProps {
  node: MergeVideosNode;
  pipelineUuid: string;
  allNodes: Node[]; // Pass all nodes to look up titles
  onRefresh: () => void; // Callback to refresh parent after reorder
}

export default function MergeVideosNodeDetails({
  node,
  pipelineUuid,
  allNodes,
  onRefresh
}: MergeVideosNodeDetailsProps) {
  const [segments, setSegments] = useState<string[]>(node.inputs.segments);
  const [isReordering, setIsReordering] = useState(false);

  // Create a lookup map for node titles
  const nodeMap = useMemo(() => {
    const map = new Map<string, string>();
    allNodes.forEach((n) => {
      map.set(n.uuid, n.title);
    });
    return map;
  }, [allNodes]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = segments.indexOf(active.id as string);
    const newIndex = segments.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newSegments = arrayMove(segments, oldIndex, newIndex);

    // Optimistically update UI
    setSegments(newSegments);
    setIsReordering(true);

    // Call Rails API to persist reordering
    void reorderNodeInputs(pipelineUuid, node.uuid, "segments", newSegments)
      .then(() => {
        setIsReordering(false);
        onRefresh();
      })
      .catch((error: unknown) => {
        setIsReordering(false);
        setSegments(node.inputs.segments ?? []);
        const errorMessage = error instanceof Error ? error.message : "Failed to reorder segments";
        alert(`Failed to reorder segments: ${errorMessage}`);
      });
  };

  return (
    <div className="space-y-6">
      {/* Segments Section */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Segments</h3>
        {segments.length === 0 ? (
          <p className="text-sm text-gray-500">No segments connected</p>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={segments} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {segments.map((segmentId, index) => {
                  const title = nodeMap.get(segmentId) ?? segmentId;
                  return (
                    <SortableSegmentItem
                      key={segmentId}
                      id={segmentId}
                      index={index}
                      title={title}
                      isReordering={isReordering}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Under the Hood Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Under the Hood</h3>

        {/* Config */}
        <Section title="Configuration">
          {Object.keys(node.config).length === 0 ? (
            <p className="text-sm text-gray-500">No configuration</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(node.config).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold text-gray-700">{key}:</span>{" "}
                  <span className="text-gray-600">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Metadata */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <Section title="Metadata">
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {JSON.stringify(node.metadata, null, 2)}
            </pre>
          </Section>
        )}

        {/* Output */}
        {node.output && Object.keys(node.output).length > 0 && (
          <Section title="Output">
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">{JSON.stringify(node.output, null, 2)}</pre>
          </Section>
        )}
      </div>
    </div>
  );
}

function SortableSegmentItem({
  id,
  index,
  title,
  isReordering
}: {
  id: string;
  index: number;
  title: string;
  isReordering: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="segment-item"
      className={`
        flex items-center gap-3 bg-gray-50 px-3 py-2 rounded border border-gray-200
        cursor-move hover:bg-gray-100 transition-colors
        ${isDragging ? "opacity-50 z-50" : ""}
        ${isReordering ? "pointer-events-none opacity-75" : ""}
      `}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <div className="flex flex-col gap-0.5">
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
      </div>

      {/* Segment Number */}
      <div
        data-testid="segment-number"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-semibold rounded"
      >
        {index + 1}
      </div>

      {/* Segment Title */}
      <div className="flex-1 text-sm text-gray-900 font-medium">{title}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}
