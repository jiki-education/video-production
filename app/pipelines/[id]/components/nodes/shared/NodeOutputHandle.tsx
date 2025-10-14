/**
 * Node Output Handle Component
 *
 * Renders the output handle for a node on the right side.
 * Color is determined by the node's output data type.
 */

import { Handle, Position } from "@xyflow/react";
import type { Node } from "@/lib/nodes/types";
import { getOutputHandleColorValue } from "@/lib/nodes/display-helpers";

interface NodeOutputHandleProps {
  node: Node;
}

export default function NodeOutputHandle({ node }: NodeOutputHandleProps) {
  const handleColor = getOutputHandleColorValue(node);

  return (
    <Handle
      type="source"
      position={Position.Right}
      id="output"
      style={{
        width: "10px",
        height: "10px",
        right: "-8px",
        backgroundColor: handleColor
      }}
    />
  );
}
