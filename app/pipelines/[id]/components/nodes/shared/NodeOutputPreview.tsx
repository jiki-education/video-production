/**
 * Node Output Preview Component
 *
 * Displays node output based on type (image, video, audio, text, or placeholder)
 */

import type { Node } from "@/lib/nodes/types";
import { getOutputPreviewUrl, getOutputDataType } from "@/lib/nodes/display-helpers";

interface NodeOutputPreviewProps {
  node: Node;
}

export default function NodeOutputPreview({ node }: NodeOutputPreviewProps) {
  // For asset nodes, check node.asset.source first
  let previewUrl: string | null = null;
  let dataType = getOutputDataType(node);

  if (node.type === "asset" && node.asset != null) {
    previewUrl = node.asset.source;
    // Asset type is already reflected in dataType via getOutputDataType
  } else {
    // For other nodes, check output
    previewUrl = getOutputPreviewUrl(node.output);
  }

  const hasPreview = previewUrl !== null && previewUrl !== "";

  if (!hasPreview) {
    return (
      <div className="w-full h-24 bg-gray-50 flex flex-col items-center justify-center text-gray-400 border-t border-gray-200">
        <span className="text-2xl mb-1">📦</span>
        <span className="text-xs">No outputs to display</span>
      </div>
    );
  }

  // Helper function to get file type label
  const getFileTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      json: "JSON",
      text: "Text",
      markdown: "Markdown",
      image: "Image",
      video: "Video",
      audio: "Audio"
    };
    return typeMap[type.toLowerCase()] || type.toUpperCase();
  };

  return (
    <div className="border-t border-gray-200">
      {dataType === "image" && previewUrl != null ? (
        <img src={previewUrl} alt="Output preview" className="w-full object-cover" />
      ) : dataType === "video" ? (
        <div className="w-full h-32 bg-gray-100 flex flex-col items-center justify-center gap-1">
          <span className="text-4xl">🎬</span>
          {node.type === "asset" && node.asset != null && (
            <span className="text-xs text-gray-600">{getFileTypeLabel(node.asset.type)}</span>
          )}
        </div>
      ) : dataType === "audio" ? (
        <div className="w-full h-16 bg-gray-100 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">🎵</span>
          {node.type === "asset" && node.asset != null && (
            <span className="text-xs text-gray-600">{getFileTypeLabel(node.asset.type)}</span>
          )}
        </div>
      ) : (
        <div className="w-full h-16 bg-gray-100 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">📄</span>
          {node.type === "asset" && node.asset != null && (
            <span className="text-xs text-gray-600">{getFileTypeLabel(node.asset.type)}</span>
          )}
        </div>
      )}
    </div>
  );
}
