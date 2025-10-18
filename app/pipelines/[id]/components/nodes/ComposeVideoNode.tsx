/**
 * Compose Video Node Component
 *
 * Displays picture-in-picture, overlays (FFmpeg)
 */

import type { ComposeVideoNode as ComposeVideoNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface ComposeVideoNodeProps {
  data: {
    node: ComposeVideoNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function ComposeVideoNode({ data, selected }: ComposeVideoNodeProps) {
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
        {node.provider === "ffmpeg" && node.config.position != null && (
          <div>
            <span className="font-semibold">Position:</span> {String(node.config.position)}
          </div>
        )}
        {node.provider === "ffmpeg" && node.config.scale != null && (
          <div>
            <span className="font-semibold">Scale:</span> {String(node.config.scale)}
          </div>
        )}
      </div>

      {/* Handles */}
      <NodeInputHandles nodeType={node.type} />
      <NodeOutputHandle node={node} />
    </div>
  );
}
