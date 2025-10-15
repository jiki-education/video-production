/**
 * Generate Animation Node Component
 *
 * Displays AI-generated animation (Veo 3, Runway, etc.)
 */

import type { GenerateAnimationNode as GenerateAnimationNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface GenerateAnimationNodeProps {
  data: {
    node: GenerateAnimationNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function GenerateAnimationNode({ data, selected }: GenerateAnimationNodeProps) {
  const { node } = data;
  const statusStyle = getNodeStatusStyle(node.status);
  const displayName = getNodeDisplayName(node);

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
        {node.config.duration != null && node.config.duration !== 0 && (
          <div>
            <span className="font-semibold">Duration:</span> {String(node.config.duration)}s
          </div>
        )}
        {node.config.aspectRatio != null && node.config.aspectRatio !== "" && (
          <div>
            <span className="font-semibold">Aspect:</span> {String(node.config.aspectRatio)}
          </div>
        )}
      </div>

      {/* Handles */}
      <NodeInputHandles nodeType={node.type} />
      <NodeOutputHandle node={node} />
    </div>
  );
}
