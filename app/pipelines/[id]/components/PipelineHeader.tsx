"use client";

import Link from "next/link";

interface PipelineHeaderProps {
  pipelineId: string;
  onRefresh: () => void;
  onRelayout: () => void;
}

export default function PipelineHeader({ pipelineId, onRefresh, onRelayout }: PipelineHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center shrink-0">
      <Link href="/" className="text-gray-700 hover:text-gray-900">
        ← Back
      </Link>
      <h1 className="flex-1 text-center font-semibold text-gray-900">{pipelineId}</h1>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded shadow-sm text-sm font-medium text-gray-700 transition-colors"
          title="Refresh from database (sync execution state)"
        >
          🔄 Refresh
        </button>
        <button
          onClick={onRelayout}
          className="bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1.5 rounded shadow-sm text-sm font-medium text-gray-700 transition-colors"
          title="Re-run auto-layout"
        >
          ⚡ Re-layout
        </button>
        <button className="px-4 py-1.5 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 text-sm font-medium transition-colors">
          ▶ Run Pipeline
        </button>
      </div>
    </header>
  );
}
