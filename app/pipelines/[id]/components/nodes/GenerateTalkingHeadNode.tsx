/**
 * Generate Talking Head Node Component
 *
 * Displays human presenter video generation (HeyGen, etc.)
 */

import type { GenerateTalkingHeadNode as GenerateTalkingHeadNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface GenerateTalkingHeadNodeProps {
  data: {
    node: GenerateTalkingHeadNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function GenerateTalkingHeadNode({ data, selected }: GenerateTalkingHeadNodeProps) {
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
      {/* Header */}
      <NodeHeader type={node.type} title={node.title} displayName={displayName} status={node.status} />

      {/* Output Preview */}
      <NodeOutputPreview node={node} />

      {/* Node Info */}
      <div className="px-4 py-3 text-xs text-gray-600 space-y-1">
        {node.provider === "heygen" && node.config.avatar_id != null && node.config.avatar_id !== "" && (
          <div>
            <span className="font-semibold">Avatar:</span> {node.config.avatar_id}
          </div>
        )}
        {node.metadata?.duration != null && (
          <div>
            <span className="font-semibold">Duration:</span> {String(node.metadata.duration)}s
          </div>
        )}
      </div>

      {/* Handles */}
      <NodeInputHandles nodeType={node.type} />
      <NodeOutputHandle node={node} />
    </div>
  );
}
