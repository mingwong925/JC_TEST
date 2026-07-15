import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="tag">第一版 MVP v0</p>
        <h1>香港賽馬預測工具</h1>
        <p className="sub">
          個人分析儀表板，已接入 HKO 天氣 API 與 HKJC 賽事抓取層，並保留失敗 fallback。
        </p>
        <div className="ctaRow">
          <Link href="/races" className="button">
            開啟賽事列表
          </Link>
          <a href="/api/races?date=2026-07-14" className="button ghost">
            測試賽事 API
          </a>
          <a href="/api/weather/current" className="button ghost">
            測試即時天氣 API
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>第一版已完成</h2>
          <ul className="list">
            <li>賽事列表頁</li>
            <li>場次頁與 Win/Place 機率</li>
            <li>賽事、預測、天氣 API 路由</li>
            <li>合規與風險提示區塊</li>
          </ul>
        </article>

        <article className="card">
          <h2>下一步開發</h2>
          <ul className="list">
            <li>把快照資料寫入 Supabase</li>
            <li>串接 GitHub Actions 抓取與推論排程</li>
            <li>加入 LightGBM 評分服務</li>
            <li>把賠率趨勢改為真實時間序列</li>
          </ul>
        </article>
      </section>

      <section className="disclaimer">
        <p>本網站僅供資訊分析參考，非投注建議。僅限 18 歲以上人士，請理性博彩。</p>
      </section>
    </main>
  );
}
