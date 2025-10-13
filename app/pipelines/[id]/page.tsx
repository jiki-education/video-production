import { readFile } from "fs/promises";
import { join } from "path";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { id } = await params;
  const pipelinePath = join(process.cwd(), "lessons", id, "pipeline.json");

  let pipelineData: unknown = null;
  let error: string | null = null;

  try {
    const fileContent = await readFile(pipelinePath, "utf-8");
    pipelineData = JSON.parse(fileContent);
  } catch (err: unknown) {
    if (err !== null && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      error = `Pipeline file not found: lessons/${id}/pipeline.json`;
    } else if (err instanceof SyntaxError) {
      error = `Invalid JSON in pipeline file: ${err.message}`;
    } else if (err instanceof Error) {
      error = `Error loading pipeline: ${err.message}`;
    } else {
      error = "Unknown error loading pipeline";
    }
  }

  if (error !== null) {
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white px-6 py-4 flex items-center shrink-0">
        <Link href="/" className="text-white hover:text-gray-300">
          ← Back
        </Link>
        <h1 className="flex-1 text-center font-semibold">{id}</h1>
        <div className="w-16"></div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Flow Canvas */}
        <div className="flex-1 bg-gray-50 overflow-auto p-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <pre className="text-xs overflow-auto">{JSON.stringify(pipelineData, null, 2)}</pre>
          </div>
        </div>

        {/* Right: Editor Panel */}
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
            <p className="text-xs mt-2">Click on a node to edit details</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Run Pipeline</button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Validate</button>
        </div>
        <div className="text-sm text-gray-600">
          Status: <span className="text-green-600 font-medium">Ready</span>
        </div>
      </footer>
    </div>
  );
}
