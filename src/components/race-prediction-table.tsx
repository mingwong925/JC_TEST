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

// Snapshot parsed from HKJC ranking pages:
// https://racing.hkjc.com/zh-hk/local/info/jockey-ranking?season=Current&view=Numbers&racecourse=ALL
// https://racing.hkjc.com/zh-hk/local/info/trainer-ranking?season=Current&view=Numbers&racecourse=ALL
const JOCKEY_RATE_SNAPSHOT: Record<string, number> = {
  潘頓: 0.2072,
  布文: 0.109,
  艾兆禮: 0.1054,
  田泰安: 0.0801,
  周俊樂: 0.0916,
  何澤堯: 0.0872,
  巴度: 0.0751,
  班德禮: 0.0771,
  霍宏聲: 0.0789,
  奧爾民: 0.0694,
  梁家俊: 0.0729,
  莫雷拉: 0.1622,
  潘明輝: 0.0565,
  希威森: 0.0549,
  鍾易禮: 0.0562,
  艾道拿: 0.0494,
  黃智弘: 0.0747,
  楊明綸: 0.0372,
  金誠剛: 0.0329,
  袁幸堯: 0.1296,
  黃寶妮: 0.0631,
  蔡明紹: 0.0288,
  布浩榮: 0.0687,
  巫顯東: 0.0359,
};

const TRAINER_RATE_SNAPSHOT: Record<string, number> = {
  方嘉柏: 0.1213,
  沈集成: 0.1217,
  廖康銘: 0.1071,
  呂健威: 0.1033,
  大衛希斯: 0.081,
  蔡約翰: 0.0889,
  巫偉傑: 0.0901,
  告東尼: 0.0758,
  姚本輝: 0.0959,
  文家良: 0.0883,
  羅富全: 0.071,
  游達榮: 0.0726,
  賀賢: 0.0755,
  伍鵬志: 0.0588,
  桂福特: 0.0791,
  蘇偉賢: 0.0607,
  黎昭昇: 0.0689,
  韋達: 0.0564,
  徐雨石: 0.0601,
  葉楚航: 0.0474,
  丁冠豪: 0.058,
  鄭俊偉: 0.0416,
};

const JOCKEY_NAME_ALIAS: Record<string, string> = {
  "A Badel": "巴度",
  "H Bowman": "布文",
  "K Teetan": "田泰安",
  "L Hewitson": "希威森",
  "C Y Ho": "何澤堯",
};

const TRAINER_NAME_ALIAS: Record<string, string> = {
  "K W Lui": "呂健威",
  "D J Hall": "賀賢",
  "P F Yiu": "姚本輝",
  "C S Shum": "沈集成",
  "J Size": "蔡約翰",
  "F C Lor": "羅富全",
};

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

function normalizeSnapshotIndex(index: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, rate] of Object.entries(index)) {
    out[normalizeName(name)] = rate;
  }
  return out;
}

function normalizeAliasIndex(index: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, alias] of Object.entries(index)) {
    out[normalizeName(name)] = alias;
  }
  return out;
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
  const [jockeyRateIndex, setJockeyRateIndex] = useState<Record<string, number>>(() =>
    normalizeSnapshotIndex(JOCKEY_RATE_SNAPSHOT),
  );
  const [trainerRateIndex, setTrainerRateIndex] = useState<Record<string, number>>(() =>
    normalizeSnapshotIndex(TRAINER_RATE_SNAPSHOT),
  );

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

  const jockeyAliasIndex = useMemo(() => normalizeAliasIndex(JOCKEY_NAME_ALIAS), []);
  const trainerAliasIndex = useMemo(() => normalizeAliasIndex(TRAINER_NAME_ALIAS), []);

  const lookupRate = (name: string, index: Record<string, number>, aliasIndex: Record<string, string>): number | undefined => {
    const key = normalizeName(name);
    if (index[key] != null) {
      return index[key];
    }

    const alias = aliasIndex[key];
    if (!alias) {
      return undefined;
    }

    return index[normalizeName(alias)];
  };

  const enriched = useMemo(
    () =>
      predictions.map((item) => {
        const jockeyRate = item.jockeyWinRate ?? lookupRate(item.jockey, jockeyRateIndex, jockeyAliasIndex);
        const trainerRate = item.trainerWinRate ?? lookupRate(item.trainer, trainerRateIndex, trainerAliasIndex);
        const comboRate = item.jockeyTrainerComboRate ?? getComboRate(jockeyRate, trainerRate);

        return {
          ...item,
          jockeyRate,
          trainerRate,
          comboRate,
        };
      }),
    [predictions, jockeyRateIndex, trainerRateIndex, jockeyAliasIndex, trainerAliasIndex],
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
