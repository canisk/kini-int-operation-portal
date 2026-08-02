import { NextResponse } from "next/server";
import { getPlanList } from "@/lib/plans-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/plans — see src/lib/plans-api.ts for the fake/real API call */
export async function GET() {
  try {
    const body = await getPlanList();
    return NextResponse.json(body, { status: body.status === 200 ? 200 : body.status || 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch plans";
    console.error("[GET /api/v1/plans]", error);
    return NextResponse.json(
      {
        status: 500,
        endpoint: "/api/v1/plans",
        count: 0,
        plans: [],
        amendedPlans: [],
        flaggedPlans: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
