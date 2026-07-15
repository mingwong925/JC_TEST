import { NextResponse } from "next/server";
import { getOddsTrendByRaceId } from "@/lib/racing-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const trend = await getOddsTrendByRaceId(id);

  if (trend.length === 0) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  return NextResponse.json({
    raceId: id,
    trend,
  });
}
