/**
 * Merge Videos Executor
 *
 * Downloads input video segments, concatenates them with FFmpeg,
 * uploads the result to S3, and updates the database.
 */

import { join } from "path";
import { randomUUID } from "crypto";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getNode, getNodes, setNodeStarted, setNodeCompleted, setNodeFailed } from "../db-executors";
import { downloadAsset, uploadAsset } from "../storage/s3";
import { mergeVideos, validateInputVideos } from "../ffmpeg/merge";
import { isMergeVideosNode } from "@/lib/nodes/types";
import type { NodeOutput } from "@/lib/types";

/**
 * Executes a merge-videos node
 *
 * @param pipelineId - The pipeline ID
 * @param nodeId - The node ID
 */
export async function executeMergeVideos(pipelineId: string, nodeId: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Executor] Starting merge-videos: ${pipelineId}/${nodeId}`);
  console.log(`${"=".repeat(60)}\n`);

  let tempOutputPath: string | null = null;

  try {
    // 1. Load node from database
    console.log("[Step 1/7] Loading node from database...");
    const node = await getNode(pipelineId, nodeId);

    if (!node) {
      throw new Error(`Node not found: ${pipelineId}/${nodeId}`);
    }

    // 2. Validate node type
    console.log("[Step 2/7] Validating node type...");
    if (!isMergeVideosNode(node)) {
      throw new Error(`Node is not a merge-videos node: ${node.type}`);
    }

    // 3. Mark as started
    console.log("[Step 3/7] Marking node as in_progress...");
    await setNodeStarted(pipelineId, nodeId);

    // 4. Get input nodes
    console.log("[Step 4/7] Loading input segments...");
    const segmentIds = node.inputs.segments || [];

    if (segmentIds.length === 0) {
      throw new Error("No input segments specified");
    }

    if (segmentIds.length === 1) {
      throw new Error("At least 2 segments required for merging");
    }

    console.log(`  Found ${segmentIds.length} input segments: ${segmentIds.join(", ")}`);

    const inputNodes = await getNodes(pipelineId, segmentIds);

    if (inputNodes.length !== segmentIds.length) {
      const foundIds = inputNodes.map((n) => n.id);
      const missingIds = segmentIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Input segments not found: ${missingIds.join(", ")}`);
    }

    // 5. Download input videos
    console.log("[Step 5/7] Downloading input videos...");
    const localPaths: string[] = [];

    for (let i = 0; i < inputNodes.length; i++) {
      const inputNode = inputNodes[i];

      if (!inputNode.output) {
        throw new Error(`Input node has no output: ${inputNode.id}`);
      }

      if (!inputNode.output.s3Key && !inputNode.output.localFile) {
        throw new Error(`Input node has no S3 key or local file: ${inputNode.id}`);
      }

      // Construct S3 URL from key (or use localFile if available)
      const url = inputNode.output.s3Key
        ? `s3://${process.env.AWS_S3_BUCKET}/${inputNode.output.s3Key}`
        : inputNode.output.localFile!;

      console.log(`  [${i + 1}/${inputNodes.length}] Downloading: ${inputNode.id}`);
      const localPath = await downloadAsset(nodeId, url);
      localPaths.push(localPath);
    }

    // Validate all videos exist
    await validateInputVideos(localPaths);

    // 6. Merge videos with FFmpeg
    console.log("[Step 6/7] Merging videos with FFmpeg...");

    // Create temp output directory
    const tempDir = join(process.cwd(), "tmp", "outputs");
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    tempOutputPath = join(tempDir, `${nodeId}-${randomUUID()}.mp4`);

    const { duration, size } = await mergeVideos(localPaths, tempOutputPath);

    console.log(`  Merged: ${duration.toFixed(2)}s, ${(size / 1024 / 1024).toFixed(2)}MB`);

    // 7. Upload to S3
    console.log("[Step 7/7] Uploading result to S3...");
    const { url, key } = await uploadAsset(tempOutputPath, pipelineId, nodeId);

    // 8. Update database with completion
    const output: NodeOutput = {
      type: "video",
      s3Key: key,
      duration,
      size
    };

    await setNodeCompleted(pipelineId, nodeId, output);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[Executor] SUCCESS: ${pipelineId}/${nodeId}`);
    console.log(`  S3: ${url}`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(`  Size: ${(size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`\n${"=".repeat(60)}`);
    console.error(`[Executor] FAILED: ${pipelineId}/${nodeId}`);
    console.error(`  Error: ${errorMessage}`);
    console.error(`${"=".repeat(60)}\n`);

    // Update database with failure
    await setNodeFailed(pipelineId, nodeId, errorMessage);

    throw error;
  } finally {
    // Clean up temporary output file
    if (tempOutputPath && existsSync(tempOutputPath)) {
      try {
        await unlink(tempOutputPath);
        console.log(`[Cleanup] Deleted temp file: ${tempOutputPath}`);
      } catch (error) {
        console.warn(`[Cleanup] Failed to delete temp file: ${tempOutputPath}`);
      }
    }
  }
}
