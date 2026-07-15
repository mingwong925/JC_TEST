import { NextResponse } from "next/server";
import { getPredictionsByRaceId } from "@/lib/racing-data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const predictions = await getPredictionsByRaceId(id);

  if (predictions.length === 0) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  return NextResponse.json({
    raceId: id,
    modelVersion: "feature-v3-no-odds",
    featureSet: [
      "recentForm",
      "surface",
      "weather",
      "jockeyWinRate",
      "trainerWinRate",
      "jockeyTrainerComboRate",
      "connectionScore",
      "nameLocale",
    ],
    predictions,
  });
}
