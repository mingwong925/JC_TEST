"use client";

import { useEffect, useMemo, useState } from "react";
import type { HorsePrediction } from "@/lib/racing-data";

type Props = {
  predictions: HorsePrediction[];
};

type Confidence = "low" | "medium" | "high";

type RankingStat = {
  numFirst?: number;
  numStarts?: number;
  trk?: string;
  ven?: string;
};

type RankingNode = {
  name_ch?: string;
  name_en?: string;
  ssnStat?: RankingStat[];
};

const HKJC_GRAPHQL = "https://info.cld.hkjc.com/graphql/base/";

function confidenceClass(value: Confidence) {
  if (value === "high") return "pill high";
  if (value === "medium") return "pill medium";
  return "pill low";
}

function formatPercent(value?: number): string {
  if (value == null) {
    return "";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function pickSeasonStat(stats: RankingStat[] | undefined): { wins: number; runs: number } | undefined {
  if (!stats || stats.length === 0) {
    return undefined;
  }

  const normalized = stats
    .map((item) => ({
      wins: Number(item.numFirst ?? Number.NaN),
      runs: Number(item.numStarts ?? Number.NaN),
      trk: (item.trk ?? "").toUpperCase(),
      ven: (item.ven ?? "").toUpperCase(),
    }))
    .filter((item) => Number.isFinite(item.wins) && Number.isFinite(item.runs) && item.runs > 0 && item.wins >= 0 && item.wins <= item.runs);

  if (normalized.length === 0) {
    return undefined;
  }

  const all = normalized.find((item) => item.trk === "ALL" && item.ven === "ALL");
  if (all) {
    return { wins: all.wins, runs: all.runs };
  }

  const maxRuns = [...normalized].sort((a, b) => b.runs - a.runs)[0];
  return maxRuns ? { wins: maxRuns.wins, runs: maxRuns.runs } : undefined;
}

function toRate(stat: { wins: number; runs: number } | undefined): number | undefined {
  if (!stat || stat.runs <= 0) {
    return undefined;
  }
  return Number((stat.wins / stat.runs).toFixed(4));
}

function buildRateIndex(nodes: RankingNode[] | undefined): Record<string, number> {
  const index: Record<string, number> = {};
  if (!nodes || nodes.length === 0) {
    return index;
  }

  for (const node of nodes) {
    const rate = toRate(pickSeasonStat(node.ssnStat));
    if (rate == null) {
      continue;
    }
    const names = [node.name_ch, node.name_en].map((name) => (name ?? "").trim()).filter(Boolean);
    for (const name of names) {
      index[normalizeName(name)] = rate;
    }
  }

  return index;
}

function getComboRate(jockeyRate?: number, trainerRate?: number): number | undefined {
  if (jockeyRate == null || trainerRate == null) {
    return undefined;
  }
  return Number(Math.sqrt(jockeyRate * trainerRate).toFixed(4));
}

export default function RacePredictionTable({ predictions }: Props) {
  const [jockeyRateIndex, setJockeyRateIndex] = useState<Record<string, number>>({});
  const [trainerRateIndex, setTrainerRateIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchRankings = async () => {
      try {
        const seasonRes = await fetch(HKJC_GRAPHQL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: `
query rw_LastMeeting($venueCodes: [String!]) {
  lastMeeting(venueCodes: $venueCodes) {
    season
  }
}
`,
            variables: { venueCodes: ["ST", "HV", "CH"] },
          }),
        });
        const seasonPayload = (await seasonRes.json()) as { data?: { lastMeeting?: { season?: string } } };
        const season = seasonPayload?.data?.lastMeeting?.season?.trim();
        if (!season) {
          return;
        }

        const [jockeyRes, trainerRes] = await Promise.all([
          fetch(HKJC_GRAPHQL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              query: `
query rw_GetJockeyRanking($season: String) {
  jockeyStat(season: $season) {
    name_ch
    name_en
    ssnStat {
      numFirst
      numStarts
      trk
      ven
    }
  }
}
`,
              variables: { season },
            }),
          }),
          fetch(HKJC_GRAPHQL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              query: `
query rw_GetTrainerRanking($season: String) {
  trainerStat(season: $season) {
    name_ch
    name_en
    ssnStat {
      numFirst
      numStarts
      trk
      ven
    }
  }
}
`,
              variables: { season },
            }),
          }),
        ]);

        const jockeyPayload = (await jockeyRes.json()) as { data?: { jockeyStat?: RankingNode[] } };
        const trainerPayload = (await trainerRes.json()) as { data?: { trainerStat?: RankingNode[] } };
        if (cancelled) {
          return;
        }

        setJockeyRateIndex(buildRateIndex(jockeyPayload?.data?.jockeyStat));
        setTrainerRateIndex(buildRateIndex(trainerPayload?.data?.trainerStat));
      } catch {
        // Keep empty on failures; strict no-fake behavior.
      }
    };

    void fetchRankings();

    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(
    () =>
      predictions.map((item) => {
        const jockeyRate = item.jockeyWinRate ?? jockeyRateIndex[normalizeName(item.jockey)];
        const trainerRate = item.trainerWinRate ?? trainerRateIndex[normalizeName(item.trainer)];
        const comboRate = item.jockeyTrainerComboRate ?? getComboRate(jockeyRate, trainerRate);

        return {
          ...item,
          jockeyRate,
          trainerRate,
          comboRate,
        };
      }),
    [predictions, jockeyRateIndex, trainerRateIndex],
  );

  return (
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
            <th>天氣影響</th>
            <th>騎師本季勝率</th>
            <th>練馬師本季勝率</th>
            <th>騎練本季勝率</th>
            <th>信心等級</th>
            <th>主要因子</th>
          </tr>
        </thead>
        <tbody>
          {enriched.map((item) => (
            <tr key={item.horseNo}>
              <td>{item.horseNo}</td>
              <td>
                <div>{item.displayName ?? item.horseName}</div>
                {item.horseNameZh && item.horseNameZh !== item.horseName && <div className="muted">{item.horseName}</div>}
              </td>
              <td>{(item.winProb * 100).toFixed(1)}%</td>
              <td>{(item.placeProb * 100).toFixed(1)}%</td>
              <td>{item.oddsWin.toFixed(1)}</td>
              <td>{(item.oddsPlace ?? 0).toFixed(1)}</td>
              <td>{formatPercent(item.weatherImpactScore)}</td>
              <td>{formatPercent(item.jockeyRate)}</td>
              <td>{formatPercent(item.trainerRate)}</td>
              <td>{formatPercent(item.comboRate)}</td>
              <td>
                <span className={confidenceClass(item.confidence)}>{item.confidence}</span>
              </td>
              <td>{item.factors.join(" / ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
