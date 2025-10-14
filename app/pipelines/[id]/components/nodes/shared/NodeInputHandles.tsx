/**
 * Node Input Handles Component
 *
 * Renders all input handles for a node dynamically based on metadata.
 * Handles are positioned vertically on the left side of the node.
 */

import { Handle, Position } from "@xyflow/react";
import type { NodeType } from "@/lib/nodes/types";
import { getNodeInputConfig } from "@/lib/nodes/metadata";
import { getInputHandleColorValue } from "@/lib/nodes/display-helpers";

interface NodeInputHandlesProps {
  nodeType: NodeType;
}

export default function NodeInputHandles({ nodeType }: NodeInputHandlesProps) {
  const inputConfig = getNodeInputConfig(nodeType);
  const inputEntries = Object.entries(inputConfig);

  // No inputs for this node type
  if (inputEntries.length === 0) {
    return null;
  }

  return (
    <>
      {inputEntries.map(([inputKey, config], index, arr) => {
        const handleColor = getInputHandleColorValue(nodeType, inputKey);

        return (
          <Handle
            key={inputKey}
            type="target"
            position={Position.Left}
            id={inputKey}
            style={{
              width: "10px",
              height: "10px",
              top: `${((index + 1) / (arr.length + 1)) * 100}%`,
              left: "-8px",
              backgroundColor: handleColor
            }}
            title={config.label}
          />
        );
      })}
    </>
  );
}
