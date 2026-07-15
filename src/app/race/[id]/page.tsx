import Link from "next/link";
import { notFound } from "next/navigation";
import { getOddsTrendByRaceId, getPredictionsByRaceId, getRaceById } from "@/lib/racing-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

function confidenceClass(value: "low" | "medium" | "high") {
  if (value === "high") return "pill high";
  if (value === "medium") return "pill medium";
  return "pill low";
}

export default async function RaceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const race = await getRaceById(id);

  if (!race) {
    notFound();
  }

  const predictions = await getPredictionsByRaceId(id);
  const trend = await getOddsTrendByRaceId(id);

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

      <section className="tableWrap">
        <h2>Win/Place 預測</h2>
        <p className="muted">賠率資料僅供參考，不參與模型計算。</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>馬匹</th>
              <th>Win</th>
              <th>Place</th>
              <th>即時獨贏賠率</th>
              <th>即時位置賠率</th>
              <th>同場交手</th>
              <th>騎師變更</th>
              <th>檔位歷史</th>
              <th>場地適配</th>
              <th>天氣影響</th>
              <th>騎師近30日勝率</th>
              <th>練馬師近30日勝率</th>
              <th>騎練近30日勝率</th>
              <th>信心等級</th>
              <th>主要因子</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((item) => (
              <tr key={item.horseNo}>
                <td>{item.horseNo}</td>
                <td>
                  <div>{item.displayName ?? item.horseName}</div>
                  {item.horseNameZh && item.horseNameZh !== item.horseName && (
                    <div className="muted">{item.horseName}</div>
                  )}
                </td>
                <td>{(item.winProb * 100).toFixed(1)}%</td>
                <td>{(item.placeProb * 100).toFixed(1)}%</td>
                <td>{item.oddsWin.toFixed(1)}</td>
                <td>{(item.oddsPlace ?? 0).toFixed(1)}</td>
                <td>{((item.headToHeadScore ?? 0) * 100).toFixed(1)}% ({item.metRivalsCount ?? 0})</td>
                <td>{item.jockeyChanged ? `是 (${item.previousJockey ?? "N/A"} -> ${item.jockey})` : "否"}</td>
                <td>{((item.drawHistoryScore ?? 0) * 100).toFixed(1)}%</td>
                <td>{((item.surfaceScore ?? 0) * 100).toFixed(1)}%</td>
                <td>{((item.weatherImpactScore ?? 0) * 100).toFixed(1)}%</td>
                <td>{((item.jockeyWinRate30d ?? 0) * 100).toFixed(1)}%</td>
                <td>{((item.trainerWinRate30d ?? 0) * 100).toFixed(1)}%</td>
                <td>{((item.jockeyTrainerComboRate30d ?? 0) * 100).toFixed(1)}%</td>
                <td>
                  <span className={confidenceClass(item.confidence)}>{item.confidence}</span>
                </td>
                <td>{item.factors.join(" / ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>賠率快照趨勢</h2>
        <p className="muted">顯示 T-60 / T-30 / T-10 分鐘的簡易檢查點（僅供參考，不參與模型計算）。</p>
        <ul className="trendList">
          {trend.map((point) => (
            <li key={`${point.horseNo}-${point.t}`}>
              馬匹 {point.horseNo} • {point.t} • 賠率 {point.odds}
            </li>
          ))}
        </ul>
      </section>

      <section className="disclaimer">
        <p>
          本網站僅供資訊分析參考，非投注建議。僅限 18 歲以上人士，請理性博彩。
        </p>
      </section>
    </main>
  );
}
