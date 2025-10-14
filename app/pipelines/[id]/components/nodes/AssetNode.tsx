/**
 * Asset Node Component
 *
 * Displays static file references (scripts, images, configs, etc.)
 */

import type { AssetNode as AssetNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface AssetNodeProps {
  data: {
    node: AssetNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function AssetNode({ data, selected }: AssetNodeProps) {
  const { node } = data;
  const statusStyle = getNodeStatusStyle(node.status);
  const displayName = getNodeDisplayName(node);

  return (
    <div
      onClick={data.onSelect}
      className={`
        bg-white rounded-lg shadow-md border cursor-pointer
        transition-all hover:shadow-lg w-[280px] overflow-hidden
        ${selected ? "ring-2 ring-blue-500" : ""}
        ${statusStyle.border}
        ${statusStyle.shadow}
      `}
    >
      {/* Header */}
      <NodeHeader type={node.type} title={node.title} displayName={displayName} status={node.status} />

      {/* Output Preview */}
      <NodeOutputPreview node={node} />

      {/* Handles */}
      <NodeInputHandles nodeType={node.type} />
      <NodeOutputHandle node={node} />
    </div>
  );
}
