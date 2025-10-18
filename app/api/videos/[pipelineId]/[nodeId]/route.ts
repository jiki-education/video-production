/**
 * Video Streaming API Route
 *
 * NOTE: This route is currently disabled during migration to Rails API.
 * Video streaming will be handled by Rails API once execution is moved there.
 *
 * TODO: Remove this file or re-implement to proxy Rails API video streaming.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    pipelineId: string;
    nodeId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { pipelineId, nodeId } = await context.params;

  return NextResponse.json(
    {
      error: "Video streaming temporarily disabled during Rails API migration",
      pipelineId,
      nodeId,
      message: "This feature will be re-enabled once video execution is migrated to Rails API"
    },
    { status: 503 }
  );
}
