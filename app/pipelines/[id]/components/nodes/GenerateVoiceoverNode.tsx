/**
 * Generate Voiceover Node Component
 *
 * Displays text-to-speech audio generation (ElevenLabs, etc.)
 */

import type { GenerateVoiceoverNode as GenerateVoiceoverNodeType } from "@/lib/nodes/types";
import { getNodeDisplayName } from "@/lib/nodes/display-helpers";
import NodeHeader from "./shared/NodeHeader";
import NodeOutputPreview from "./shared/NodeOutputPreview";
import NodeInputHandles from "./shared/NodeInputHandles";
import NodeOutputHandle from "./shared/NodeOutputHandle";
import { getNodeStatusStyle } from "./shared/getNodeStatusStyle";

interface GenerateVoiceoverNodeProps {
  data: {
    node: GenerateVoiceoverNodeType;
    onSelect: () => void;
  };
  selected: boolean;
}

export default function GenerateVoiceoverNode({ data, selected }: GenerateVoiceoverNodeProps) {
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
        {node.provider === "elevenlabs" && node.config.voice_id != null && node.config.voice_id !== "" && (
          <div>
            <span className="font-semibold">Voice:</span> {String(node.config.voice_id)}
          </div>
        )}
        {node.provider === "elevenlabs" && node.config.model != null && (
          <div>
            <span className="font-semibold">Model:</span> {String(node.config.model)}
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
