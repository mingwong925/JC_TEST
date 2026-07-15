import { NextResponse } from "next/server";
import { getNineDayForecast } from "@/lib/racing-data";

export async function GET() {
  const forecast = await getNineDayForecast();
  return NextResponse.json(forecast);
}
