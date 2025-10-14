/**
 * Editor Panel Component
 *
 * Displays details for the selected node and provides actions.
 * In this phase, it's read-only (editing comes in Phase 4).
 */

"use client";

import { useTransition } from "react";
import type { Node } from "@/lib/nodes/types";

interface EditorPanelProps {
  selectedNode: Node | null;
  pipelineId: string;
  onDelete: (nodeId: string) => Promise<void>;
}

export default function EditorPanel({ selectedNode, pipelineId: _pipelineId, onDelete }: EditorPanelProps) {
  const [isDeleting, startDeletion] = useTransition();

  if (!selectedNode) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
          <p className="text-sm font-medium">No node selected</p>
          <p className="text-xs mt-2">Click on a node to view details</p>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete node "${selectedNode.id}"?`)) {
      startDeletion(async () => {
        await onDelete(selectedNode.id);
      });
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Node Details</h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Node ID */}
        <Section title="Node ID">
          <div className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{selectedNode.id}</div>
        </Section>

        {/* Type */}
        <Section title="Type">
          <div className="flex items-center gap-2">
            <TypeBadge type={selectedNode.type} />
          </div>
        </Section>

        {/* Status */}
        <Section title="Status">
          <StatusBadge status={selectedNode.status} />
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          {Object.keys(selectedNode.inputs).length === 0 ? (
            <p className="text-sm text-gray-500">No inputs</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(selectedNode.inputs).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold text-gray-700">{key}:</span>{" "}
                  {Array.isArray(value) ? (
                    <div className="ml-4 mt-1 space-y-1">
                      {value.map((id, idx) => (
                        <div key={idx} className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {id}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{value}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Config */}
        <Section title="Configuration">
          {Object.keys(selectedNode.config).length === 0 ? (
            <p className="text-sm text-gray-500">No configuration</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(selectedNode.config).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="font-semibold text-gray-700">{key}:</span>{" "}
                  <span className="text-gray-600">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Asset (for asset nodes) */}
        {selectedNode.type === "asset" && selectedNode.asset != null && (
          <Section title="Asset">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold text-gray-700">Source:</span>{" "}
                <span className="text-gray-600 break-all">{selectedNode.asset.source}</span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-gray-700">Type:</span>{" "}
                <span className="text-gray-600">{selectedNode.asset.type}</span>
              </div>
            </div>
          </Section>
        )}

        {/* Metadata */}
        {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
          <Section title="Metadata">
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {JSON.stringify(selectedNode.metadata, null, 2)}
            </pre>
          </Section>
        )}

        {/* Output */}
        {selectedNode.output && Object.keys(selectedNode.output).length > 0 && (
          <Section title="Output">
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {JSON.stringify(selectedNode.output, null, 2)}
            </pre>
          </Section>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {isDeleting ? "Deleting..." : "Delete Node"}
        </button>
        <p className="text-xs text-gray-500 mt-2 text-center">Node editing coming in Phase 4</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const icons: Record<string, string> = {
    asset: "📄",
    "talking-head": "👤",
    "render-code": "💻",
    "generate-animation": "🎬",
    "generate-voiceover": "🎙️",
    "mix-audio": "🎵",
    "merge-videos": "🎞️",
    "compose-video": "🖼️"
  };

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
      <span>{icons[type] || "📦"}</span>
      <span className="font-medium">{type}</span>
    </span>
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
