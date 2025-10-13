import { readdir } from "fs/promises";
import { join } from "path";
import Link from "next/link";

export default async function Home() {
  const lessonsDir = join(process.cwd(), "lessons");

  let lessons: string[] = [];
  try {
    const entries = await readdir(lessonsDir, { withFileTypes: true });
    lessons = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    console.error("Error reading lessons directory:", error);
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Jiki Pipelines</h1>
      <p>Select a pipeline to view:</p>

      {lessons.length === 0 ? (
        <p>No pipelines found in the lessons/ directory.</p>
      ) : (
        <ul>
          {lessons.map((lesson) => (
            <li key={lesson} style={{ margin: "0.5rem 0" }}>
              <Link href={`/pipelines/${lesson}`}>{lesson}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
