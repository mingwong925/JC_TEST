import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return NextResponse.json({
    raceId: id,
    error: "Odds trend has been removed",
  }, { status: 410 });
}
