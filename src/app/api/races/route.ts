import { NextResponse } from "next/server";
import { getHongKongDateString, getRacesWithNextFallback } from "@/lib/racing-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? getHongKongDateString();

  const result = await getRacesWithNextFallback(date);
  const races = result.races.map((race) => ({
    id: race.id,
    date: race.date,
    course: race.course,
    raceNo: race.raceNo,
    className: race.className,
    distanceM: race.distanceM,
    raceTime: race.raceTime ?? null,
    going: race.going,
    updatedAt: race.updatedAt,
  }));

  return NextResponse.json({
    requestedDate: result.requestedDate,
    effectiveDate: result.effectiveDate,
    fallbackApplied: result.fallbackApplied,
    source: process.env.USE_MOCK_DATA === "true" ? "mock" : "live",
    count: races.length,
    races,
  });
}
