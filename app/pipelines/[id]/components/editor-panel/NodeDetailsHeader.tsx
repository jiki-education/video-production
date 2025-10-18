/**
 * Node Details Header Component
 *
 * Shared header for the RHS node details panel.
 * Displays node ID, type, and status in a compact format.
 */

"use client";

import type { Node } from "@/lib/nodes/types";

interface NodeDetailsHeaderProps {
  node: Node;
}

const NODE_ICONS: Record<string, string> = {
  asset: "📄",
  "generate-talking-head": "👤",
  "render-code": "💻",
  "generate-animation": "🎬",
  "generate-voiceover": "🎙️",
  "mix-audio": "🎵",
  "merge-videos": "🎞️",
  "compose-video": "🖼️"
};

export default function NodeDetailsHeader({ node }: NodeDetailsHeaderProps) {
  const icon = NODE_ICONS[node.type] || "📦";

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className="text-2xl flex-shrink-0">{icon}</span>

        {/* Node ID and Type */}
        <div className="flex-1 min-w-0">
          <div className="font-mono font-semibold text-sm text-gray-900 truncate" title={node.id}>
            {node.id}
          </div>
          <div className="text-xs text-gray-600">{node.type}</div>
        </div>

        {/* Status Badge */}
        <StatusBadge status={node.status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700 animate-pulse",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700"
  };

  const icons = {
    pending: "⏳",
    in_progress: "⚙️",
    completed: "✅",
    failed: "❌"
  };

  const labels = {
    pending: "PENDING",
    in_progress: "PROCESSING",
    completed: "DONE",
    failed: "FAILED"
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold ${colors[status as keyof typeof colors] || colors.pending}`}
    >
      <span>{icons[status as keyof typeof icons] || "⏳"}</span>
      <span>{labels[status as keyof typeof labels] || status.toUpperCase()}</span>
    </span>
  );
}
