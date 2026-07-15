import { NextResponse } from "next/server";
import { getCurrentWeather } from "@/lib/racing-data";

export async function GET() {
  const weather = await getCurrentWeather();
  return NextResponse.json(weather);
}
