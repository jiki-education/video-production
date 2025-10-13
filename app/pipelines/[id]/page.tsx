import { readFile } from "fs/promises";
import { join } from "path";

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
      <main style={{ padding: "2rem" }}>
        <h1>Pipeline: {id}</h1>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #c00",
            borderRadius: "4px"
          }}
        >
          <strong>Error:</strong> {error}
        </div>
        <p style={{ marginTop: "1rem" }}>
          <a href="/">← Back to pipelines</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Pipeline: {id}</h1>
      <p style={{ marginBottom: "1rem" }}>
        <a href="/">← Back to pipelines</a>
      </p>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "1rem",
          borderRadius: "4px",
          overflow: "auto"
        }}
      >
        <pre style={{ margin: 0 }}>{JSON.stringify(pipelineData, null, 2)}</pre>
      </div>
    </main>
  );
}
