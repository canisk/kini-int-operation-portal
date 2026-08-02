import { NextResponse } from "next/server";
import { getAuditLogsForOffering } from "@/lib/offering-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/v1/plans/:id/audit-logs — unlisted change log from SQLite audit_logs */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const trimmed = decodeURIComponent(id).trim();

  if (!trimmed) {
    return NextResponse.json(
      { status: 400, endpoint: "/api/v1/plans/:id/audit-logs", error: "Plan ID is required", logs: [] },
      { status: 400 },
    );
  }

  try {
    const logs = getAuditLogsForOffering(trimmed);
    return NextResponse.json({
      status: 200,
      endpoint: `/api/v1/plans/${encodeURIComponent(trimmed)}/audit-logs`,
      count: logs.length,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audit logs";
    return NextResponse.json(
      {
        status: 500,
        endpoint: `/api/v1/plans/${encodeURIComponent(trimmed)}/audit-logs`,
        error: message,
        logs: [],
      },
      { status: 500 },
    );
  }
}
