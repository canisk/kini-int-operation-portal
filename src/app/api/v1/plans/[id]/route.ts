import { NextResponse } from "next/server";
import { getPlanById } from "@/lib/plans-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/v1/plans/:id — see src/lib/plans-api.ts for the fake/real API call */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await getPlanById(id);
    return NextResponse.json(body, { status: body.status === 200 ? 200 : body.status || 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch plan";
    return NextResponse.json(
      {
        status: 500,
        endpoint: `/api/v1/plans/${encodeURIComponent(id)}`,
        plan: null,
        error: message,
      },
      { status: 500 },
    );
  }
}
