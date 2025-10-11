import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import { join } from "path";

async function renderAllScenes() {
  console.log(`📦 Bundling Remotion project...`);

  const bundled = await bundle({
    entryPoint: join(process.cwd(), "src/index.ts")
  });

  console.log(`📋 Getting all compositions...`);

  const compositions = await getCompositions(bundled);

  console.log(`Found ${compositions.length} compositions to render`);

  for (const composition of compositions) {
    console.log(`\n🎬 Rendering: ${composition.id}`);

    const outputPath = join(process.cwd(), "out", `${composition.id}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath
    });

    console.log(`✅ Rendered: ${composition.id}`);
  }

  console.log(`\n🎉 All scenes rendered successfully!`);
}

renderAllScenes().catch(console.error);
