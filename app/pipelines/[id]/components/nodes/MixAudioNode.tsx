/**
 * Mix Audio Node Component
 *
 * Displays audio track replacement/overlay (FFmpeg)
 */

import type { MixAudioNode as MixAudioNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface MixAudioNodeProps {
  data: {
    node: MixAudioNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function MixAudioNode({ data, selected }: MixAudioNodeProps) {
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
        {node.provider === "ffmpeg" && node.config.audio_codec != null && (
          <div>
            <span className="font-semibold">Codec:</span> {String(node.config.audio_codec)}
          </div>
        )}
        {node.provider === "ffmpeg" && node.config.volume != null && node.config.volume !== 0 && (
          <div>
            <span className="font-semibold">Volume:</span> {String(node.config.volume)}
          </div>
        )}
      </div>

      {/* Handles */}
      <NodeInputHandles nodeType={node.type} />
      <NodeOutputHandle node={node} />
    </div>
  );
}
