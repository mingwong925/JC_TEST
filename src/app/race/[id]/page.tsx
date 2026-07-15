import Link from "next/link";
import { notFound } from "next/navigation";
import { getPredictionsByRaceId, getRaceById } from "@/lib/racing-data";
import RacePredictionTable from "@/components/race-prediction-table";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const race = await getRaceById(id);

  if (!race) {
    notFound();
  }

  const predictions = await getPredictionsByRaceId(id);

  return (
    <main className="shell">
      <section className="hero">
        <p className="tag">場次詳情</p>
        <h1>
          {race.course} R{race.raceNo} • {race.className}
        </h1>
        <p className="sub">
          {race.distanceM}米 • 場地 {race.going} • 賽事日期及時間 {race.date} {race.raceTime ?? "待公布"}
        </p>
        <Link href="/races" className="button ghost">
          返回賽事列表
        </Link>
      </section>

      <RacePredictionTable predictions={predictions} />

      <section className="disclaimer">
        <p>
          本網站僅供資訊分析參考，非投注建議。僅限 18 歲以上人士，請理性博彩。
        </p>
      </section>
    </main>
  );
}
