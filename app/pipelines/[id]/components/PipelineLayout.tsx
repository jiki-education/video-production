"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { Node } from "@/lib/nodes/types";
import type { Pipeline } from "@/lib/types";
import PipelineHeader from "./PipelineHeader";
import PipelineEditor from "./PipelineEditor";

interface PipelineLayoutProps {
  pipelineId: string;
  pipeline: Pipeline;
  nodes: Node[];
}

export default function PipelineLayout({ pipelineId, pipeline, nodes }: PipelineLayoutProps) {
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleRelayout = useCallback(() => {
    // This is just a pass-through - the actual logic is in PipelineEditor
  }, []);

  return (
    <>
      <PipelineHeader pipelineId={pipelineId} onRefresh={handleRefresh} onRelayout={handleRelayout} />
      <PipelineEditor pipeline={pipeline} nodes={nodes} onRefresh={handleRefresh} onRelayout={handleRelayout} />
    </>
  );
}
