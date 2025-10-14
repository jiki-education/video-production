import Link from "next/link";
import { query } from "@/lib/db";
import { nodesFromDB } from "@/lib/nodes/factory";
import type { Pipeline, Node as DBNode } from "@/lib/types";
import PipelineLayout from "./components/PipelineLayout";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { id } = await params;

  let pipeline: Pipeline | null = null;
  let nodes: DBNode[] = [];
  let error: string | null = null;

  try {
    // Get pipeline from database
    const pipelines = await query<Pipeline>("SELECT * FROM pipelines WHERE id = $1", [id]);

    if (pipelines.length === 0) {
      error = `Pipeline not found: ${id}`;
    } else {
      pipeline = pipelines[0];

      // Get nodes for this pipeline
      nodes = await query<DBNode>("SELECT * FROM nodes WHERE pipeline_id = $1", [id]);
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

  // Convert DB nodes to domain nodes for type safety
  const domainNodes = nodesFromDB(nodes);

  return (
    <div className="h-screen flex flex-col">
      <PipelineLayout pipelineId={id} pipeline={pipeline} nodes={domainNodes} />
    </div>
  );
}
