import Link from "next/link";
import { getHongKongDateString, getRacesWithNextFallback } from "@/lib/racing-data";

type RacesPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function RacesPage({ searchParams }: RacesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const dateParam = params?.date;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? (dateParam as string) : getHongKongDateString();
  const result = await getRacesWithNextFallback(date);
  const races = result.races;

  return (
    <main className="shell">
      <section className="hero">
        <p className="tag">賽事列表</p>
        <h1>香港賽事（{result.effectiveDate}）</h1>
        <p className="sub">資料來源：HKJC 即時抓取。若當日無場次，會自動顯示下一個有賽事的日期。</p>
      </section>

      {result.fallbackApplied && (
        <section className="disclaimer">
          <p>你查詢的日期 {result.requestedDate} 沒有場次，已自動切換到下一個賽日 {result.effectiveDate}。</p>
        </section>
      )}

      <section className="grid">
        {races.length === 0 && (
          <article className="card">
            <h2>目前沒有可顯示場次</h2>
            <p className="muted">
              可能是來源暫時不可用，或未來 14 天都沒有可抓取賽事。可改用網址參數測試，例如
              <code>?date=2026-07-12</code>。
            </p>
          </article>
        )}
        {races.map((race) => (
          <article key={race.id} className="card">
            <div className="row">
              <strong>R{race.raceNo}</strong>
              <span>{race.course}</span>
            </div>
            <h2>{race.className}</h2>
            <p>{race.distanceM}米 • 場地 {race.going}</p>
            <p className="muted">賽事日期及時間：{race.date} {race.raceTime ?? "待公布"}</p>
            <Link href={`/race/${race.id}`} className="button">
              查看預測
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
