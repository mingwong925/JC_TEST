import { NextResponse } from "next/server";
import { getDataLatencyStatus } from "@/lib/racing-data";

export async function GET() {
  return NextResponse.json(await getDataLatencyStatus());
}
