/**
 * Node Status Style Utility
 *
 * Returns border, background, and shadow classes for node status visualization
 */

export function getNodeStatusStyle(status: string) {
  const styles = {
    pending: { border: "border-gray-300", bg: "bg-gray-50", shadow: "" },
    in_progress: { border: "border-blue-400", bg: "bg-blue-50", shadow: "" },
    completed: { border: "border-green-400", bg: "bg-green-50", shadow: "shadow-[0_0_8px_rgba(74,222,128,0.3)]" },
    failed: { border: "border-red-400", bg: "bg-red-50", shadow: "" }
  };

  return styles[status as keyof typeof styles] ?? styles.pending;
}
