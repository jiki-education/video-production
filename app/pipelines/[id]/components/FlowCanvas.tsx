"use client";

interface FlowCanvasProps {
  pipelineData: unknown;
}

export default function FlowCanvas({ pipelineData }: FlowCanvasProps) {
  return (
    <div className="flex-1 bg-gray-50 overflow-auto p-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <pre className="text-xs overflow-auto">{JSON.stringify(pipelineData, null, 2)}</pre>
      </div>
    </div>
  );
}
