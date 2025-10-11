import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { join } from "path";

async function renderScene(sceneName: string) {
  console.log(`📦 Bundling Remotion project...`);

  const bundled = await bundle({
    entryPoint: join(process.cwd(), "src/index.ts")
  });

  console.log(`🎬 Rendering scene: ${sceneName}`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: sceneName
  });

  const outputPath = join(process.cwd(), "out", `${sceneName}.mp4`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath
  });

  console.log(`✅ Rendered to: ${outputPath}`);
}

// Get scene name from command line args
const sceneName = process.argv[2] || "example-basic";
renderScene(sceneName).catch(console.error);
