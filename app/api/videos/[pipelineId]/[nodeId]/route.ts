/**
 * Video Streaming API Route
 *
 * Streams videos from S3 (via cache) to the browser.
 * Supports range requests for proper video seeking.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { stat, open } from "fs/promises";
import { createReadStream } from "fs";
import { getNode } from "@/lib/pipeline/db-executors";
import { downloadAsset } from "@/lib/pipeline/storage/s3";

interface RouteContext {
  params: Promise<{
    pipelineId: string;
    nodeId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { pipelineId, nodeId } = await context.params;

    // 1. Load node from database
    const node = await getNode(pipelineId, nodeId);

    if (!node) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // 2. Get video URL from node
    let videoUrl: string | null = null;

    // Check asset nodes
    if (node.type === "asset" && node.asset?.type === "video") {
      videoUrl = node.asset.source;
    }
    // Check output nodes
    else if (node.output?.type === "video" && node.output.s3Key !== undefined && node.output.s3Key !== null) {
      videoUrl = `s3://${process.env.AWS_S3_BUCKET}/${node.output.s3Key}`;
    }

    if (videoUrl === null || videoUrl === undefined) {
      return NextResponse.json({ error: "Node has no video output" }, { status: 404 });
    }

    // 3. Download to cache (or get cached path)
    const filePath = await downloadAsset(nodeId, videoUrl);

    // 4. Get file stats
    const stats = await stat(filePath);
    const fileSize = stats.size;

    // 5. Handle range requests (for video seeking)
    const range = request.headers.get("range");

    if (range === null || range === undefined) {
      // No range request - send entire file
      const fileHandle = await open(filePath, "r");
      const stream = fileHandle.createReadStream();

      return new NextResponse(stream as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes"
        }
      });
    }

    // Parse range header (e.g., "bytes=0-1023")
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    // Create read stream for range
    const stream = createReadStream(filePath, { start, end });

    return new NextResponse(stream as unknown as BodyInit, {
      status: 206, // Partial Content
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": "video/mp4"
      }
    });
  } catch (error) {
    console.error("[Video API] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
