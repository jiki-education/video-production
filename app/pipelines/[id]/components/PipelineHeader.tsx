import Link from "next/link";

interface PipelineHeaderProps {
  pipelineId: string;
}

export default function PipelineHeader({ pipelineId }: PipelineHeaderProps) {
  return (
    <header className="bg-gray-800 text-white px-6 py-4 flex items-center shrink-0">
      <Link href="/" className="text-white hover:text-gray-300">
        ← Back
      </Link>
      <h1 className="flex-1 text-center font-semibold">{pipelineId}</h1>
      <div className="w-16"></div>
    </header>
  );
}
