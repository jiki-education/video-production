import Link from "next/link";
import { query } from "@/lib/db";
import type { Pipeline, Node } from "@/lib/types";
import PipelineHeader from "./components/PipelineHeader";
import PipelineFooter from "./components/PipelineFooter";
import EditorPanel from "./components/EditorPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { id } = await params;

  let pipeline: Pipeline | null = null;
  let nodes: Node[] = [];
  let error: string | null = null;

  try {
    // Get pipeline from database
    const pipelines = await query<Pipeline>("SELECT * FROM pipelines WHERE id = $1", [id]);

    if (pipelines.length === 0) {
      error = `Pipeline not found: ${id}`;
    } else {
      pipeline = pipelines[0];

      // Get nodes for this pipeline
      nodes = await query<Node>("SELECT * FROM nodes WHERE pipeline_id = $1", [id]);
    }
  } catch (err) {
    console.error("Error loading pipeline from database:", err);
    error = err instanceof Error ? err.message : "Unknown database error";
  }

  if (error !== null || pipeline === null) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-gray-800 text-white px-6 py-4 flex items-center">
          <Link href="/" className="text-white hover:text-gray-300">
            ← Back
          </Link>
          <h1 className="flex-1 text-center font-semibold">Pipeline: {id}</h1>
          <div className="w-16"></div>
        </header>

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-red-50 border border-red-400 rounded-lg p-6 max-w-2xl">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Make sure the pipeline exists in the database. Run: <code className="bg-red-100 px-1">pnpm db:seed</code>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <PipelineHeader pipelineId={id} />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{pipeline.title}</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Pipeline ID:</span>
                  <span className="ml-2 text-gray-600">{pipeline.id}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Version:</span>
                  <span className="ml-2 text-gray-600">{pipeline.version}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Created:</span>
                  <span className="ml-2 text-gray-600">{new Date(pipeline.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Updated:</span>
                  <span className="ml-2 text-gray-600">{new Date(pipeline.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(pipeline.config, null, 2)}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Nodes ({nodes.length})</h3>

              {nodes.length === 0 ? (
                <p className="text-gray-500 text-sm">No nodes in this pipeline yet.</p>
              ) : (
                <div className="space-y-4">
                  {nodes.map((node) => (
                    <div key={node.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{node.id}</h4>
                          <p className="text-sm text-gray-600">Type: {node.type}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            node.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : node.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : node.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {node.status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        {node.inputs !== null && Object.keys(node.inputs).length > 0 && (
                          <div>
                            <span className="font-semibold">Inputs:</span> {JSON.stringify(node.inputs)}
                          </div>
                        )}
                        {node.config !== null && Object.keys(node.config).length > 0 && (
                          <div>
                            <span className="font-semibold">Config:</span> {JSON.stringify(node.config)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(pipeline.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <EditorPanel />
      </main>

      <PipelineFooter />
    </div>
  );
}
