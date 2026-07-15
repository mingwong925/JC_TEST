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
    modelVersion: "feature-v4-all-signals",
    featureSet: [
      "oddsWin",
      "oddsPlace",
      "recentForm",
      "headToHead",
      "jockeyChange",
      "draw",
      "drawHistory",
      "weight",
      "surface",
      "weather",
      "jockey",
      "trainer",
      "jockeyWinRate",
      "trainerWinRate",
      "jockeyTrainerComboRate",
      "connectionScore",
      "nameLocale",
    ],
    predictions,
  });
}
