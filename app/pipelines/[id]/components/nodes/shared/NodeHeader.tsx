/**
 * Node Header Component
 *
 * Displays node title, type, and status in a consistent header layout
 */

import type { NodeType } from "@/lib/nodes/types";
import StatusBadge from "./StatusBadge";

interface NodeHeaderProps {
  type: NodeType;
  title: string;
  displayName: string;
  status: string;
}

const NODE_ICONS: Record<NodeType, string> = {
  asset: "📄",
  "generate-talking-head": "👤",
  "render-code": "💻",
  "generate-animation": "🎬",
  "generate-voiceover": "🎙️",
  "mix-audio": "🎵",
  "merge-videos": "🎞️",
  "compose-video": "🎨"
};

export default function NodeHeader({ type, title, displayName, status }: NodeHeaderProps) {
  const icon = NODE_ICONS[type] || "📦";

  return (
    <div className="px-4 py-2 rounded-t-lg bg-white">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate" title={title}>
            {title}
          </div>
          <div className="text-xs text-gray-600 truncate">{displayName}</div>
        </div>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}
