/**
 * Server Actions for Pipeline Editor
 *
 * These functions wrap atomic database operations and can be called
 * directly from Client Components. They run on the server and have
 * access to the PostgreSQL database.
 *
 * Each action:
 * 1. Performs the database operation
 * 2. Calls revalidatePath() to refresh the UI
 * 3. Returns success/error status
 */

"use server";

import { revalidatePath } from "next/cache";
import { createNode, deleteNode, connectNodes, reorderNodeInputs } from "@/lib/db-operations";
import type { CreateNodeInput } from "@/lib/types";

// ============================================================================
// Node Actions
// ============================================================================

/**
 * Creates a new node in the pipeline
 *
 * @param pipelineId - The pipeline ID
 * @param node - Node structure (id, type, inputs, config, asset)
 * @returns Success status and created node or error message
 *
 * Example:
 *   const result = await createNodeAction('lesson-001', {
 *     id: 'code_screen',
 *     type: 'render-code',
 *     inputs: { config: 'code_config' },
 *     config: { provider: 'remotion', compositionId: 'code-scene' }
 *   });
 */
export async function createNodeAction(pipelineId: string, node: CreateNodeInput) {
  try {
    const createdNode = await createNode(pipelineId, node);
    revalidatePath(`/pipelines/${pipelineId}`);
    return { success: true, node: createdNode };
  } catch (error) {
    console.error("Error creating node:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create node"
    };
  }
}

/**
 * Deletes a node from the pipeline
 *
 * Also cleans up references to this node in other nodes' inputs.
 *
 * @param pipelineId - The pipeline ID
 * @param nodeId - The node ID to delete
 * @returns Success status or error message
 *
 * Example:
 *   const result = await deleteNodeAction('lesson-001', 'code_screen');
 */
export async function deleteNodeAction(pipelineId: string, nodeId: string) {
  try {
    await deleteNode(pipelineId, nodeId);
    // Note: No revalidatePath - using optimistic updates in client
    return { success: true };
  } catch (error) {
    console.error("Error deleting node:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete node"
    };
  }
}

/**
 * Connects two nodes by creating a dependency
 *
 * Sets targetNode.inputs[inputKey] = sourceNodeId
 *
 * @param pipelineId - The pipeline ID
 * @param sourceNodeId - The source node (providing output)
 * @param targetNodeId - The target node (receiving input)
 * @param inputKey - The input key on the target node
 * @returns Success status or error message
 *
 * Example:
 *   const result = await connectNodesAction(
 *     'lesson-001',
 *     'code_config',
 *     'code_screen',
 *     'config'
 *   );
 */
export async function connectNodesAction(
  pipelineId: string,
  sourceNodeId: string,
  targetNodeId: string,
  inputKey: string
) {
  try {
    await connectNodes(pipelineId, sourceNodeId, targetNodeId, inputKey);
    // Note: No revalidatePath - using optimistic updates in client
    return { success: true };
  } catch (error) {
    console.error("Error connecting nodes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect nodes"
    };
  }
}

/**
 * Reorders the inputs array for a specific input key on a node
 *
 * Updates the order of node IDs and sets status to 'pending'.
 *
 * @param pipelineId - The pipeline ID
 * @param nodeId - The node ID to update
 * @param inputKey - The input key containing the array to reorder
 * @param newOrder - The new array of node IDs in desired order
 * @returns Success status or error message
 *
 * Example:
 *   const result = await reorderInputsAction(
 *     'lesson-001',
 *     'final_video',
 *     'segments',
 *     ['intro', 'body', 'outro']
 *   );
 */
export async function reorderInputsAction(pipelineId: string, nodeId: string, inputKey: string, newOrder: string[]) {
  try {
    await reorderNodeInputs(pipelineId, nodeId, inputKey, newOrder);
    revalidatePath(`/pipelines/${pipelineId}`);
    return { success: true };
  } catch (error) {
    console.error("Error reordering inputs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder inputs"
    };
  }
}
