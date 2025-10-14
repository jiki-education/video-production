/**
 * Status Badge Component
 *
 * Displays node execution status with color coding
 */

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700 animate-pulse",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700"
  };

  const labels = {
    pending: "PENDING",
    in_progress: "PROCESSING",
    completed: "DONE",
    failed: "FAILED"
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors[status as keyof typeof colors] || colors.pending}`}
    >
      {labels[status as keyof typeof labels] || status.toUpperCase()}
    </span>
  );
}
