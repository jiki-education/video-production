/**
 * Merge Videos Node Component
 *
 * Displays video concatenation (FFmpeg)
 */

import type { MergeVideosNode as MergeVideosNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface MergeVideosNodeProps {
  data: {
    node: MergeVideosNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function MergeVideosNode({ data, selected }: MergeVideosNodeProps) {
  const { node } = data;
  const statusStyle = getNodeStatusStyle(node.status);
  const displayName = getNodeDisplayName(node);
  const segmentCount = node.inputs.segments?.length ?? 0;

  return (
    <div
      onClick={data.onSelect}
      className={`
        bg-white rounded-lg shadow-md border cursor-pointer
        transition-all hover:shadow-lg w-[280px]
        ${selected ? "ring-2 ring-blue-500" : ""}
        ${statusStyle.border}
        ${statusStyle.shadow}
      `}
    >
      <NodeHeader type={node.type} title={node.title} displayName={displayName} status={node.status} />
      <NodeOutputPreview node={node} />

      <div className="px-4 py-3 text-xs text-gray-600 space-y-1">
        <div>
          <span className="font-semibold">Segments:</span> {segmentCount}
        </div>
        {node.config.transitions != null && node.config.transitions !== "" && (
          <div>
            <span className="font-semibold">Transitions:</span> {String(node.config.transitions)}
          </div>
        )}
      </div>

      {/* Handles */}
      <NodeInputHandles nodeType={node.type} />
      <NodeOutputHandle node={node} />
    </div>
  );
}
