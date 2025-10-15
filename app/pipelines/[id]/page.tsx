import Link from "next/link";
import { getPipeline } from "@/lib/api-client";
import type { Pipeline as APIPipeline } from "@/lib/api-client";
import type { Pipeline } from "@/lib/types";
import type { Node } from "@/lib/nodes/types";
import PipelineLayout from "./components/PipelineLayout";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { id } = await params;

  let pipeline: APIPipeline | null = null;
  let nodes: Node[] = [];
  let error: string | null = null;

  try {
    // Get pipeline from Rails API
    const data = await getPipeline(id);
    pipeline = data.pipeline;
    nodes = data.nodes as Node[];
  } catch (err) {
    console.error("Error loading pipeline from API:", err);
    error = err instanceof Error ? err.message : "Unknown API error";
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
            <p className="text-sm text-red-600 mt-2">This will work once the Rails API is implemented.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Cast pipeline to lib/types Pipeline (API returns strings, DB expects Dates) */}
      <PipelineLayout pipelineId={id} pipeline={pipeline as unknown as Pipeline} nodes={nodes} />
    </div>
  );
}
