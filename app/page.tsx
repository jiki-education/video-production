import Link from "next/link";
import { query } from "@/lib/db";
import type { Pipeline } from "@/lib/types";

export default async function Home() {
  let pipelines: Pipeline[] = [];
  let error: string | null = null;

  try {
    pipelines = await query<Pipeline>("SELECT * FROM pipelines ORDER BY updated_at DESC");
  } catch (err) {
    console.error("Error loading pipelines from database:", err);
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Jiki Video Pipelines</h1>
        <p className="text-gray-600 mb-8">Select a pipeline to view and edit</p>

        {error !== null ? (
          <div className="bg-red-50 border border-red-400 rounded-lg p-4">
            <p className="text-red-800">
              <strong>Database Error:</strong> {error}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Make sure PostgreSQL is running and run: <code className="bg-red-100 px-1">pnpm db:init</code>
            </p>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>No pipelines found.</strong>
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Create a pipeline or run: <code className="bg-yellow-100 px-1">pnpm db:seed</code>
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {pipelines.map((pipeline) => (
              <Link
                key={pipeline.id}
                href={`/pipelines/${pipeline.id}`}
                className="block px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{pipeline.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">ID: {pipeline.id}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Updated: {new Date(pipeline.updated_at).toLocaleDateString()}</div>
                    <div className="text-xs mt-1">v{pipeline.version}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
