import * as cheerio from "cheerio";

export type HorsePrediction = {
  horseNo: number;
  horseCode?: string;
  horseName: string;
  horseNameZh?: string;
  displayName?: string;
  jockey: string;
  trainer: string;
  draw: number;
  weight: number;
  oddsWin: number;
  oddsPlace?: number;
  recentFormScore?: number;
  headToHeadScore?: number;
  oddsScore?: number;
  jockeyChangeScore?: number;
  drawHistoryScore?: number;
  carryWeightScore?: number;
  surfaceScore?: number;
  weatherImpactScore?: number;
  jockeyWinRate?: number;
  trainerWinRate?: number;
  jockeyTrainerComboRate?: number;
  connectionScore?: number;
  finalScore?: number;
  metRivalsCount?: number;
  jockeyChanged?: boolean;
  previousJockey?: string;
  drawRangeLabel?: string;
  winProb: number;
  placeProb: number;
  confidence: "low" | "medium" | "high";
  factors: string[];
};

export type Race = {
  id: string;
  date: string;
  course: "ST" | "HV";
  raceNo: number;
  className: string;
  distanceM: number;
  raceTime?: string;
  going: string;
  updatedAt: string;
  entries: HorsePrediction[];
};

type WeatherCurrent = {
  source: "hko" | "mock";
  updateTime: string;
  temperatureC: number | null;
  humidity: number | null;
  icon: number | null;
};

type NineDayForecast = {
  source: "hko" | "mock";
  updateTime: string;
  days: Array<{
    date: string;
    week: string;
    minTempC: number;
    maxTempC: number;
    weather: string;
  }>;
};

const HKJC_BASE = "https://racing.hkjc.com/en-us/local/information/localresults";
const HKJC_ZH_BASE = "https://racing.hkjc.com/zh-hk/local/information/localresults";
const HKJC_ENTRIES_BASE = "https://racing.hkjc.com/en-us/local/information/entries";
const HKJC_RACECARD_BASE = "https://racing.hkjc.com/en-us/local/information/racecard";
const HKJC_ZH_RACECARD_BASE = "https://racing.hkjc.com/zh-hk/local/information/racecard";
const HKJC_JOCKEY_STANDINGS_BASE =
  "https://racing.hkjc.com/zh-hk/local/info/jockey-ranking?season=Current&view=Numbers&racecourse=ALL";
const HKJC_TRAINER_STANDINGS_BASE =
  "https://racing.hkjc.com/zh-hk/local/info/trainer-ranking?season=Current&view=Numbers&racecourse=ALL";
const HKJC_LOCAL_GRAPHQL_BASE = "https://info.cld.hkjc.com/graphql/base/";
const HKO_BASE = process.env.HKO_BASE_URL ?? "https://data.weather.gov.hk/weatherAPI/opendata/weather.php";
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true";
const USE_LIVE_HKJC = process.env.USE_LIVE_HKJC !== "false";

type HorseHistoryRecord = {
  date: string;
  placing: number;
  jockey: string;
};

type RecentStats = {
  runs: number;
  wins: number;
};

type HkjcRankingStatNode = {
  numFirst?: number;
  numStarts?: number;
  trk?: string;
  ven?: string;
};

type HkjcJockeyNode = {
  name_ch?: string;
  name_en?: string;
  ssnStat?: HkjcRankingStatNode[];
};

type HkjcTrainerNode = {
  name_ch?: string;
  name_en?: string;
  ssnStat?: HkjcRankingStatNode[];
};

type ModelContext = {
  going?: string;
  weather?: {
    temperatureC: number | null;
    humidity: number | null;
  };
};

type EntryRaceMeta = {
  raceNo: number;
  className: string;
  distanceM: number;
};

type RaceCardMeta = {
  className: string;
  distanceM: number;
  raceTime?: string;
  going: string;
};

type RaceCardRunner = {
  horseNo: number;
  horseCode?: string;
  horseNameZh: string;
  jockey: string;
  trainer: string;
  draw: number;
  weight: number;
  rating: number;
};

type LiveWinPlaceOdds = {
  winByNo: Map<number, number>;
  placeByNo: Map<number, number>;
};

const horseNameZhByCode: Record<string, string> = {
  H123: "美麗導彈",
  J269: "龍之晨",
  J508: "凱旋勇士",
  H106: "金鎧",
};

const jockeyStatsLiveIndex: Record<string, RecentStats> = {};
const trainerStatsLiveIndex: Record<string, RecentStats> = {};
const jockeyTrainerComboLiveIndex: Record<string, RecentStats> = {};

export function getHongKongDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const raceData: Race[] = [
  {
    id: "2026-07-14-ST-1",
    date: "2026-07-14",
    course: "ST",
    raceNo: 1,
    className: "Class 4",
    distanceM: 1200,
    going: "Good",
    updatedAt: "2026-07-14T09:05:00+08:00",
    entries: [
      {
        horseNo: 1,
        horseName: "Silver Peak",
        jockey: "A Badel",
        trainer: "K W Lui",
        draw: 3,
        weight: 132,
        oddsWin: 4.8,
        winProb: 0.24,
        placeProb: 0.51,
        confidence: "high",
        factors: ["Draw advantage", "Stable form up", "Positive odds drift"],
      },
      {
        horseNo: 2,
        horseName: "Fast Comet",
        jockey: "H Bowman",
        trainer: "D J Hall",
        draw: 10,
        weight: 128,
        oddsWin: 6.2,
        winProb: 0.18,
        placeProb: 0.42,
        confidence: "medium",
        factors: ["Jockey form strong", "Wide draw risk", "Consistent last 3 runs"],
      },
      {
        horseNo: 3,
        horseName: "Lucky Tempo",
        jockey: "K Teetan",
        trainer: "P F Yiu",
        draw: 5,
        weight: 126,
        oddsWin: 8.5,
        winProb: 0.13,
        placeProb: 0.33,
        confidence: "medium",
        factors: ["Suitable distance", "Late pace profile", "Market support steady"],
      },
      {
        horseNo: 4,
        horseName: "Dragon Echo",
        jockey: "L Hewitson",
        trainer: "C S Shum",
        draw: 12,
        weight: 123,
        oddsWin: 19,
        winProb: 0.07,
        placeProb: 0.2,
        confidence: "low",
        factors: ["Long odds", "Outside barrier", "Needs fast pace setup"],
      },
    ],
  },
  {
    id: "2026-07-14-HV-3",
    date: "2026-07-14",
    course: "HV",
    raceNo: 3,
    className: "Class 3",
    distanceM: 1650,
    going: "Good to Firm",
    updatedAt: "2026-07-14T09:10:00+08:00",
    entries: [
      {
        horseNo: 1,
        horseName: "Urban Legend",
        jockey: "R Kingscote",
        trainer: "J Size",
        draw: 2,
        weight: 135,
        oddsWin: 3.9,
        winProb: 0.27,
        placeProb: 0.56,
        confidence: "high",
        factors: ["Top trainer strike rate", "Inside draw", "Strong sectional profile"],
      },
      {
        horseNo: 2,
        horseName: "Midnight Gear",
        jockey: "C Y Ho",
        trainer: "F C Lor",
        draw: 7,
        weight: 130,
        oddsWin: 5.4,
        winProb: 0.21,
        placeProb: 0.47,
        confidence: "medium",
        factors: ["Pace versatility", "Recent top-3 finish", "Neutral draw"],
      },
      {
        horseNo: 3,
        horseName: "North Star",
        jockey: "L Ferraris",
        trainer: "D Eustace",
        draw: 9,
        weight: 124,
        oddsWin: 11,
        winProb: 0.1,
        placeProb: 0.29,
        confidence: "low",
        factors: ["Weight relief", "Needs clean run", "Limited upside on figures"],
      },
    ],
  },
];

function formatDateForHkjc(date: string): string {
  return date.replace(/-/g, "/");
}

function parseRaceId(id: string): { date: string; course: "ST" | "HV"; raceNo: number } | null {
  const match = id.match(/^(\d{4}-\d{2}-\d{2})-(ST|HV)-(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    date: match[1],
    course: match[2] as "ST" | "HV",
    raceNo: Number(match[3]),
  };
}

function parseNumber(input: string | undefined, fallback = 0): number {
  if (!input) {
    return fallback;
  }

  const clean = input.replace(/,/g, "").match(/[0-9]+(\.[0-9]+)?/);
  if (!clean) {
    return fallback;
  }

  return Number(clean[0]);
}

function extractHorseCode(raw: string): string | undefined {
  const match = raw.match(/\(([A-Z]\d+)\)/i);
  return match?.[1]?.toUpperCase();
}

function normalizeHorseName(raw: string): string {
  return raw.replace(/\s*\([A-Z]\d+\)\s*$/i, "").trim();
}

function confidenceByWinProb(winProb: number): "low" | "medium" | "high" {
  if (winProb >= 0.2) {
    return "high";
  }
  if (winProb >= 0.1) {
    return "medium";
  }
  return "low";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getRecentHistory(): HorseHistoryRecord[] {
  // Strict mode: no synthetic/local mock history.
  // Return empty until real historical source is connected.
  return [];
}

function getRecentFormScore(): { score?: number; previousJockey?: string } {
  const history = getRecentHistory();
  if (history.length === 0) {
    return {};
  }

  const avgPlacing = history.reduce((sum, item) => sum + item.placing, 0) / history.length;
  const normalized = clamp01((14 - avgPlacing) / 13);
  return {
    score: Number(normalized.toFixed(4)),
    previousJockey: history[0]?.jockey,
  };
}

function getHeadToHeadMetrics(
  target: HorsePrediction,
  entries: HorsePrediction[],
): { score?: number; metRivalsCount: number } {
  void target;
  void entries;
  // Strict mode: no synthetic/local head-to-head source.
  return { metRivalsCount: 0 };
}

function normalizeGoing(going?: string): string {
  const raw = (going ?? "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return "";
  }

  const zhMap: Record<string, string> = {
    好地: "GOOD",
    快地: "FIRM",
    好快地: "GOOD TO FIRM",
    好地至快地: "GOOD TO FIRM",
    好地至快快地: "GOOD TO FIRM",
    黏地: "YIELDING",
    好黏地: "GOOD TO YIELDING",
    好地至黏地: "GOOD TO YIELDING",
    軟地: "SOFT",
    泥快地: "FAST",
    泥好地: "GOOD",
    泥黏地: "SLOW",
    濕快地: "WET FAST",
    慢地: "SLOW",
  };

  if (zhMap[raw]) {
    return zhMap[raw];
  }

  return raw.toUpperCase();
}

function getDrawHistoryScore(entry: HorsePrediction): number | undefined {
  void entry;
  // Strict mode: no synthetic/local draw history source.
  return undefined;
}

function getDrawRangeLabel(entry: HorsePrediction): string {
  const min = Math.max(1, entry.draw - 1);
  const max = Math.min(14, entry.draw + 1);
  return `${min}-${max}檔附近`;
}

function getSurfaceScore(going?: string): number {
  const normalizedGoing = normalizeGoing(going);
  if (!normalizedGoing) {
    return 0.5;
  }

  return normalizedGoing.includes("GOOD") ? 0.65 : 0.5;
}

function normalizePersonName(name: string): string {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseStandingsStatsFromHtml(html: string): Record<string, RecentStats> {
  const $ = cheerio.load(html);
  const result: Record<string, RecentStats> = {};

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();

    if (cells.length < 7) {
      return;
    }

    const name = cells[0];
    if (!name) {
      return;
    }

    const wins = parseNumber(cells[1], Number.NaN);
    const runs = parseNumber(cells[6], Number.NaN);
    if (!Number.isFinite(runs) || !Number.isFinite(wins) || runs <= 0 || wins < 0 || wins > runs) {
      return;
    }

    result[normalizePersonName(name)] = { runs, wins };
  });

  return result;
}

function pickAggregateSeasonStat(stats: HkjcRankingStatNode[] | undefined): RecentStats | undefined {
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

  const allStat = normalized.find((item) => item.trk === "ALL" && item.ven === "ALL");
  if (allStat) {
    return { wins: allStat.wins, runs: allStat.runs };
  }

  const byRuns = [...normalized].sort((a, b) => b.runs - a.runs)[0];
  return byRuns ? { wins: byRuns.wins, runs: byRuns.runs } : undefined;
}

function parseJockeyStatsFromGraphql(nodes: HkjcJockeyNode[] | undefined): Record<string, RecentStats> {
  const result: Record<string, RecentStats> = {};
  if (!nodes || nodes.length === 0) {
    return result;
  }

  for (const node of nodes) {
    const stat = pickAggregateSeasonStat(node.ssnStat);
    if (!stat) {
      continue;
    }

    const names = [node.name_ch, node.name_en].map((name) => (name ?? "").trim()).filter(Boolean);
    for (const name of names) {
      result[normalizePersonName(name)] = stat;
    }
  }

  return result;
}

function parseTrainerStatsFromGraphql(nodes: HkjcTrainerNode[] | undefined): Record<string, RecentStats> {
  const result: Record<string, RecentStats> = {};
  if (!nodes || nodes.length === 0) {
    return result;
  }

  for (const node of nodes) {
    const stat = pickAggregateSeasonStat(node.ssnStat);
    if (!stat) {
      continue;
    }

    const names = [node.name_ch, node.name_en].map((name) => (name ?? "").trim()).filter(Boolean);
    for (const name of names) {
      result[normalizePersonName(name)] = stat;
    }
  }

  return result;
}

async function fetchGraphqlJson<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(HKJC_LOCAL_GRAPHQL_BASE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (compatible; JC-TEST-MVP/1.0)",
      accept: "application/json",
      origin: "https://racing.hkjc.com",
      referer: "https://racing.hkjc.com/",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchCurrentSeasonCode(): Promise<string | undefined> {
  try {
    const payload = await fetchGraphqlJson<{ data?: { lastMeeting?: { season?: string } } }>(
      `
query rw_LastMeeting($venueCodes: [String!]) {
  lastMeeting(venueCodes: $venueCodes) {
    date
    season
  }
}
`,
      { venueCodes: ["ST", "HV", "CH"] },
    );
    const season = payload?.data?.lastMeeting?.season?.trim();
    if (season) {
      return season;
    }
  } catch {
    // fallback to season period query
  }

  try {
    const payload = await fetchGraphqlJson<{ data?: { racingSeasonPeriod?: Array<{ code?: string }> } }>(
      `
query rw_RacingSeasonPeriod($locSim: LocalSim) {
  racingSeasonPeriod(locSim: $locSim) {
    code
    endDate
    startDate
  }
}
`,
      { locSim: "LOCAL" },
    );
    const season = payload?.data?.racingSeasonPeriod?.[0]?.code?.trim();
    return season || undefined;
  } catch {
    return undefined;
  }
}

async function refreshLiveConnectionStats(): Promise<void> {
  for (const key of Object.keys(jockeyStatsLiveIndex)) {
    delete jockeyStatsLiveIndex[key];
  }
  for (const key of Object.keys(trainerStatsLiveIndex)) {
    delete trainerStatsLiveIndex[key];
  }
  for (const key of Object.keys(jockeyTrainerComboLiveIndex)) {
    delete jockeyTrainerComboLiveIndex[key];
  }

  try {
    const season = await fetchCurrentSeasonCode();
    if (season) {
      const [jockeyPayload, trainerPayload] = await Promise.all([
        fetchGraphqlJson<{ data?: { jockeyStat?: HkjcJockeyNode[] } }>(
          `
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
          { season },
        ),
        fetchGraphqlJson<{ data?: { trainerStat?: HkjcTrainerNode[] } }>(
          `
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
          { season },
        ),
      ]);

      const jockeyParsed = parseJockeyStatsFromGraphql(jockeyPayload?.data?.jockeyStat);
      const trainerParsed = parseTrainerStatsFromGraphql(trainerPayload?.data?.trainerStat);
      Object.assign(jockeyStatsLiveIndex, jockeyParsed);
      Object.assign(trainerStatsLiveIndex, trainerParsed);
    }

    if (Object.keys(jockeyStatsLiveIndex).length > 0 || Object.keys(trainerStatsLiveIndex).length > 0) {
      return;
    }

    const [jockeyHtml, trainerHtml] = await Promise.all([
      fetchText(HKJC_JOCKEY_STANDINGS_BASE),
      fetchText(HKJC_TRAINER_STANDINGS_BASE),
    ]);
    Object.assign(jockeyStatsLiveIndex, parseStandingsStatsFromHtml(jockeyHtml));
    Object.assign(trainerStatsLiveIndex, parseStandingsStatsFromHtml(trainerHtml));
  } catch {
    // strict mode: if fetch fails keep indices empty instead of fake fallback
  }
}

function getWeatherImpactScore(entry: HorsePrediction, weather?: ModelContext["weather"]): number {
  if (!weather || weather.temperatureC == null || weather.humidity == null) {
    return 0.5;
  }

  const base = 0.5;
  const tempPenalty = Math.max(0, weather.temperatureC - 30) * 0.02;
  const humidityPenalty = Math.max(0, weather.humidity - 85) * 0.005;
  const weightPenalty = Math.max(0, entry.weight - 130) * 0.003;
  return Number(clamp01(base - tempPenalty - humidityPenalty - weightPenalty + 0.12).toFixed(4));
}

function getSmoothedWinRate(stats: RecentStats): number {
  const priorRate = 0.1;
  const priorWeight = 20;
  const rate = (stats.wins + priorRate * priorWeight) / (stats.runs + priorWeight);
  return Number(clamp01(rate).toFixed(4));
}

function getJockeyWinRate(entry: HorsePrediction): number | undefined {
  const stats = jockeyStatsLiveIndex[normalizePersonName(entry.jockey)];
  if (!stats) {
    return undefined;
  }
  return getSmoothedWinRate(stats);
}

function getTrainerWinRate(entry: HorsePrediction): number | undefined {
  const stats = trainerStatsLiveIndex[normalizePersonName(entry.trainer)];
  if (!stats) {
    return undefined;
  }
  return getSmoothedWinRate(stats);
}

function getJockeyTrainerComboRate(entry: HorsePrediction): number | undefined {
  const key = `${normalizePersonName(entry.jockey)}|${normalizePersonName(entry.trainer)}`;
  const stats = jockeyTrainerComboLiveIndex[key];
  if (!stats) {
    return undefined;
  }
  return getSmoothedWinRate(stats);
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0) || 1;
  return exps.map((value) => value / sum);
}

function resolveHorseNameZh(entry: HorsePrediction): string | undefined {
  if (entry.horseNameZh) {
    return entry.horseNameZh;
  }
  if (entry.horseCode && horseNameZhByCode[entry.horseCode]) {
    return horseNameZhByCode[entry.horseCode];
  }
  return undefined;
}

function buildTopFactors(entry: HorsePrediction): string[] {
  const metrics = [
    entry.oddsScore != null
      ? { name: `賠率強度 ${Math.round(entry.oddsScore * 100)}%`, score: entry.oddsScore }
      : null,
    entry.recentFormScore != null
      ? { name: `賽績 ${Math.round(entry.recentFormScore * 100)}%`, score: entry.recentFormScore }
      : null,
    entry.headToHeadScore != null
      ? { name: `同場交手 ${Math.round(entry.headToHeadScore * 100)}%`, score: entry.headToHeadScore }
      : null,
    entry.drawHistoryScore != null
      ? {
        name: `${entry.drawRangeLabel ?? "1-14檔附近"} ${Math.round(entry.drawHistoryScore * 100)}%`,
        score: entry.drawHistoryScore,
      }
      : null,
    entry.carryWeightScore != null
      ? { name: `負磅優勢 ${Math.round(entry.carryWeightScore * 100)}%`, score: entry.carryWeightScore }
      : null,
    entry.weatherImpactScore != null
      ? { name: `天氣影響 ${Math.round(entry.weatherImpactScore * 100)}%`, score: entry.weatherImpactScore }
      : null,
    entry.jockeyWinRate != null
      ? { name: `騎師本季勝率 ${Math.round(entry.jockeyWinRate * 100)}%`, score: entry.jockeyWinRate }
      : null,
    entry.trainerWinRate != null
      ? { name: `練馬師本季勝率 ${Math.round(entry.trainerWinRate * 100)}%`, score: entry.trainerWinRate }
      : null,
    entry.jockeyTrainerComboRate != null
      ? {
        name: `騎練本季勝率 ${Math.round(entry.jockeyTrainerComboRate * 100)}%`,
        score: entry.jockeyTrainerComboRate,
      }
      : null,
    entry.jockeyChangeScore != null && entry.jockeyChanged
      ? { name: "騎師變更", score: entry.jockeyChangeScore }
      : null,
  ].filter((item): item is { name: string; score: number } => item != null);

  if (metrics.length === 0) {
    return ["資料不足"];
  }

  return metrics
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.name);
}

function estimatePlaceOddsFromWin(winOdds: number): number {
  if (!Number.isFinite(winOdds) || winOdds <= 1) {
    return 1.1;
  }

  const estimated = 1 + (winOdds - 1) * 0.25;
  return Number(Math.max(1.1, estimated).toFixed(1));
}

function applyFeatureModel(entries: HorsePrediction[], context?: ModelContext): HorsePrediction[] {
  if (entries.length === 0) {
    return entries;
  }

  const withNeutral = (value: number | undefined): number => (value == null ? 0.5 : value);

  const draws = entries.map((entry) => entry.draw).filter((value) => Number.isFinite(value));
  const weights = entries.map((entry) => entry.weight).filter((value) => Number.isFinite(value));
  const minDraw = draws.length > 0 ? Math.min(...draws) : 1;
  const maxDraw = draws.length > 0 ? Math.max(...draws) : 14;
  const minWeight = weights.length > 0 ? Math.min(...weights) : 113;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 135;

  const normalizeInverse = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return 0.5;
    }
    return clamp01((max - value) / (max - min));
  };

  const normalizeDirect = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return 0.5;
    }
    return clamp01((value - min) / (max - min));
  };

  const fieldOddsStrength = entries.map((entry) => {
    const placeOdds = entry.oddsPlace ?? estimatePlaceOddsFromWin(entry.oddsWin);
    const winImplied = 1 / Math.max(1.01, entry.oddsWin);
    const placeImplied = 1 / Math.max(1.01, placeOdds);
    return clamp01(winImplied * 0.65 + placeImplied * 0.35);
  });
  const minOddsStrength = Math.min(...fieldOddsStrength);
  const maxOddsStrength = Math.max(...fieldOddsStrength);

  const scored = entries.map((entry) => {
    const form = getRecentFormScore();
    const h2h = getHeadToHeadMetrics(entry, entries);
    const jockeyChanged = Boolean(form.previousJockey && form.previousJockey !== entry.jockey);
    const jockeyChangeScore = jockeyChanged ? 0.45 : 0.55;
    const drawHistoryScore = getDrawHistoryScore(entry) ?? normalizeInverse(entry.draw, minDraw, maxDraw);
    const drawRangeLabel = getDrawRangeLabel(entry);
    const surfaceScore = getSurfaceScore(context?.going);
    const weatherImpactScore = getWeatherImpactScore(entry, context?.weather);
    const carryWeightScore = normalizeInverse(entry.weight, minWeight, maxWeight);
    const placeOdds = entry.oddsPlace ?? estimatePlaceOddsFromWin(entry.oddsWin);
    const winImplied = 1 / Math.max(1.01, entry.oddsWin);
    const placeImplied = 1 / Math.max(1.01, placeOdds);
    const oddsStrength = clamp01(winImplied * 0.65 + placeImplied * 0.35);
    const oddsScore = normalizeDirect(oddsStrength, minOddsStrength, maxOddsStrength);
    const jockeyWinRate = getJockeyWinRate(entry);
    const trainerWinRate = getTrainerWinRate(entry);
    const jockeyTrainerComboRate = getJockeyTrainerComboRate(entry);
    const connectionScore =
      jockeyWinRate == null || trainerWinRate == null || jockeyTrainerComboRate == null
        ? undefined
        : Number(
          clamp01(jockeyWinRate * 0.4 + trainerWinRate * 0.4 + jockeyTrainerComboRate * 0.2).toFixed(4),
        );
    const finalScore = Number(
      (
        withNeutral(oddsScore) * 0.3 +
        withNeutral(jockeyWinRate) * 0.16 +
        withNeutral(trainerWinRate) * 0.16 +
        withNeutral(jockeyTrainerComboRate) * 0.08 +
        withNeutral(drawHistoryScore) * 0.12 +
        withNeutral(carryWeightScore) * 0.08 +
        withNeutral(surfaceScore) * 0.06 +
        withNeutral(weatherImpactScore) * 0.04
      ).toFixed(4),
    );

    return {
      ...entry,
      horseNameZh: resolveHorseNameZh(entry),
      displayName: resolveHorseNameZh(entry) ?? entry.horseName,
      recentFormScore: form.score == null ? undefined : Number(form.score.toFixed(4)),
      headToHeadScore: h2h.score == null ? undefined : Number(h2h.score.toFixed(4)),
      jockeyChangeScore,
      drawHistoryScore,
      carryWeightScore,
      drawRangeLabel,
      oddsScore,
      surfaceScore,
      weatherImpactScore,
      jockeyWinRate,
      trainerWinRate,
      jockeyTrainerComboRate,
      connectionScore,
      metRivalsCount: h2h.metRivalsCount,
      jockeyChanged,
      previousJockey: form.previousJockey,
      finalScore,
    } as HorsePrediction;
  });

  const probs = softmax(scored.map((entry) => entry.finalScore ?? 0));
  return scored.map((entry, index) => {
    const winProb = Number(probs[index].toFixed(4));
    const placeProb = Number(Math.min(0.85, winProb * 2.2).toFixed(4));
    const enriched: HorsePrediction = {
      ...entry,
      winProb,
      placeProb,
      oddsPlace: entry.oddsPlace ?? estimatePlaceOddsFromWin(entry.oddsWin),
      confidence: confidenceByWinProb(winProb),
      factors: buildTopFactors(entry),
    };
    return enriched;
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; JC-TEST-MVP/1.0)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function getFieldFromTable($: cheerio.CheerioAPI, label: string): string {
  let value = "";
  $("td").each((_, td) => {
    const text = $(td).text().replace(/\s+/g, " ").trim();
    if (text.toLowerCase() === label.toLowerCase()) {
      value = $(td).next("td").text().replace(/\s+/g, " ").trim();
    }
  });
  return value;
}

function extractRaceTime(rawHtml: string): string | undefined {
  const matches = [...rawHtml.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((m) => `${m[1].padStart(2, "0")}:${m[2]}`);
  const uniq = Array.from(new Set(matches));
  return uniq.find((item) => item >= "11:00" && item <= "23:59");
}

function toClassNameFromChinese(raw: string): string | undefined {
  const match = raw.match(/第\s*([一二三四五])\s*班/);
  if (!match) {
    return undefined;
  }

  const map: Record<string, string> = {
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
  };
  const n = map[match[1]];
  return n ? `Class ${n}` : undefined;
}

async function fetchZhRaceCardMetaById(parsed: {
  date: string;
  course: "ST" | "HV";
  raceNo: number;
}): Promise<RaceCardMeta | undefined> {
  const url = `${HKJC_ZH_RACECARD_BASE}?raceDate=${formatDateForHkjc(parsed.date)}&racecourse=${parsed.course}&raceNo=${parsed.raceNo}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const rawText = $("div.f_fs13").first().text().replace(/\s+/g, " ").trim();
  if (!rawText) {
    return undefined;
  }

  const className = toClassNameFromChinese(rawText) ?? "Class N/A";
  const distanceM = parseNumber(rawText.match(/(\d+)米/)?.[1], 0);
  const raceTime = rawText.match(/(\d{2}:\d{2})/)?.[1];
  const going =
    rawText.match(
      /(好地至快地|好地至快快地|好地至黏地|好地|黏地|軟地|泥快地|泥好地|泥黏地|濕快地|慢地)/,
    )?.[1] ?? "待公布";

  return {
    className,
    distanceM,
    raceTime,
    going,
  };
}

async function fetchZhRaceCardRunnersById(parsed: {
  date: string;
  course: "ST" | "HV";
  raceNo: number;
}): Promise<RaceCardRunner[]> {
  const url = `${HKJC_ZH_RACECARD_BASE}?raceDate=${formatDateForHkjc(parsed.date)}&racecourse=${parsed.course}&raceNo=${parsed.raceNo}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const rows = $("a[href*='horse?horseid']");
  const runners: RaceCardRunner[] = [];

  rows.each((_, anchor) => {
    const tr = $(anchor).closest("tr");
    const cells = tr
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();

    if (cells.length < 12) {
      return;
    }

    const horseNo = parseNumber(cells[0], Number.NaN);
    if (!Number.isFinite(horseNo)) {
      return;
    }

    const horseNameZh = cells[3] ?? "";
    const horseCode = cells[4] || undefined;
    const weight = parseNumber(cells[5], 0);
    const jockey = cells[6] || "N/A";
    const draw = parseNumber(cells[8], 0);
    const trainer = cells[9] || "N/A";
    const rating = parseNumber(cells[11], 0);

    if (!horseNameZh) {
      return;
    }

    runners.push({
      horseNo,
      horseCode,
      horseNameZh,
      jockey,
      trainer,
      draw,
      weight,
      rating,
    });
  });

  return runners.sort((a, b) => a.horseNo - b.horseNo);
}

async function fetchRaceTimeById(parsed: { date: string; course: "ST" | "HV"; raceNo: number }): Promise<string | undefined> {
  const url = `${HKJC_RACECARD_BASE}?raceDate=${formatDateForHkjc(parsed.date)}&racecourse=${parsed.course}&raceNo=${parsed.raceNo}`;
  const html = await fetchText(url);
  return extractRaceTime(html);
}

function parseOddsValue(raw: string | undefined): number | undefined {
  if (!raw) {
    return undefined;
  }
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) {
    return undefined;
  }
  return n;
}

async function fetchLiveWinPlaceOddsByRace(parsed: {
  date: string;
  course: "ST" | "HV";
  raceNo: number;
}): Promise<LiveWinPlaceOdds> {
  const query = `
query racing($date: String, $venueCode: String, $oddsTypes: [OddsType], $raceNo: Int) {
  raceMeetings(date: $date, venueCode: $venueCode) {
    pmPools(oddsTypes: $oddsTypes, raceNo: $raceNo) {
      oddsType
      oddsNodes {
        combString
        oddsValue
      }
    }
  }
}
`;

  type Payload = {
    data?: {
      raceMeetings?: Array<{
        pmPools?: Array<{
          oddsType?: string;
          oddsNodes?: Array<{
            combString?: string;
            oddsValue?: string;
          }>;
        }>;
      }>;
    };
  };

  const winByNo = new Map<number, number>();
  const placeByNo = new Map<number, number>();

  try {
    const response = await fetch(HKJC_LOCAL_GRAPHQL_BASE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; JC-TEST-MVP/1.0)",
      },
      body: JSON.stringify({
        operationName: "racing",
        variables: {
          date: parsed.date,
          venueCode: parsed.course,
          raceNo: parsed.raceNo,
          oddsTypes: ["WIN", "PLA"],
        },
        query,
      }),
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as Payload;
      const pools = payload?.data?.raceMeetings?.[0]?.pmPools ?? [];
      for (const pool of pools) {
        const oddsType = (pool.oddsType ?? "").toUpperCase();
        if (oddsType !== "WIN" && oddsType !== "PLA") {
          continue;
        }

        for (const node of pool.oddsNodes ?? []) {
          const horseNo = parseNumber(node.combString, Number.NaN);
          const odds = parseOddsValue(node.oddsValue);
          if (!Number.isFinite(horseNo) || odds == null) {
            continue;
          }

          if (oddsType === "WIN") {
            winByNo.set(horseNo, odds);
          } else {
            placeByNo.set(horseNo, odds);
          }
        }
      }
    }
  } catch {
    // fallback below
  }

  if (winByNo.size > 0 || placeByNo.size > 0) {
    return { winByNo, placeByNo };
  }

  // Fallback: parse live odds from the HKJC Win/Place webpage text mirror.
  // Source page: https://bet.hkjc.com/ch/racing/wp/{date}/{venue}/{raceNo}
  const mirrorUrl = `https://r.jina.ai/http://bet.hkjc.com/ch/racing/wp/${parsed.date}/${parsed.course}/${parsed.raceNo}`;
  const mirrorText = await fetchText(mirrorUrl);
  const rowRegex = /(\d+)\[[^\]]+\]\([^)]*\)\d+\s+\d+\[[^\]]+\]\([^)]*\)\[[^\]]+\]\([^)]*\)-\s*\[x\][\s\S]*?\[([0-9]+(?:\.[0-9]+)?)\]\([^)]*\)\s*-\s*\[x\][\s\S]*?\[([0-9]+(?:\.[0-9]+)?)\]\(/g;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(mirrorText)) !== null) {
    const horseNo = Number(match[1]);
    const winOdds = Number(match[2]);
    const placeOdds = Number(match[3]);
    if (Number.isFinite(horseNo) && Number.isFinite(winOdds) && winOdds > 0) {
      winByNo.set(horseNo, winOdds);
    }
    if (Number.isFinite(horseNo) && Number.isFinite(placeOdds) && placeOdds > 0) {
      placeByNo.set(horseNo, placeOdds);
    }
  }

  return { winByNo, placeByNo };
}

async function fetchEntriesRaceMetaByDate(date: string): Promise<{ course: "ST" | "HV"; races: EntryRaceMeta[] } | undefined> {
  const url = `${HKJC_ENTRIES_BASE}?RaceDate=${formatDateForHkjc(date)}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const pageText = $.text().replace(/\s+/g, " ").trim();

  const course = pageText.includes("Happy Valley") ? "HV" : pageText.includes("Sha Tin") ? "ST" : undefined;
  if (!course) {
    return undefined;
  }

  const matches = [...pageText.matchAll(/Class\s+(\d+)\s+(\d+)m\s+Section/gi)];
  if (matches.length === 0) {
    return undefined;
  }

  const races = matches.map((match, index) => ({
    raceNo: index + 1,
    className: `Class ${match[1]}`,
    distanceM: Number(match[2]),
  }));

  return { course, races };
}

async function fetchHkjcChineseNameByNo(
  parsed: { date: string; course: "ST" | "HV"; raceNo: number },
): Promise<Map<number, string>> {
  const url = `${HKJC_ZH_BASE}?racedate=${formatDateForHkjc(parsed.date)}&Racecourse=${parsed.course}&RaceNo=${parsed.raceNo}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const result = new Map<number, string>();

  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();

    if (cells.length < 3) {
      return;
    }

    const horseNo = parseNumber(cells[1], Number.NaN);
    if (!Number.isFinite(horseNo)) {
      return;
    }

    const horseNameZh = cells[2];
    if (horseNameZh) {
      result.set(horseNo, horseNameZh);
    }
  });

  return result;
}

async function fetchHkjcRaceById(id: string): Promise<Race | undefined> {
  const parsed = parseRaceId(id);
  if (!parsed) {
    return undefined;
  }

  const url = `${HKJC_BASE}?racedate=${formatDateForHkjc(parsed.date)}&Racecourse=${parsed.course}&RaceNo=${parsed.raceNo}`;
  const html = await fetchText(url);
  const $ = cheerio.load(html);

  const classDistance = $("td")
    .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
    .get()
    .find((item) => /Class\s*\d+\s*-\s*\d+M/i.test(item));

  let distanceM = classDistance ? parseNumber(classDistance.match(/(\d+)M/i)?.[1], 0) : 0;
  let className = classDistance?.match(/Class\s*\d+/i)?.[0] ?? "Class N/A";
  let going = getFieldFromTable($, "Going :") || "待公布";
  let raceTime: string | undefined;
  try {
    raceTime = await fetchRaceTimeById(parsed);
  } catch {
    raceTime = undefined;
  }

  try {
    const zhMeta = await fetchZhRaceCardMetaById(parsed);
    if (zhMeta) {
      className = zhMeta.className || className;
      distanceM = zhMeta.distanceM || distanceM;
      going = zhMeta.going || going;
      raceTime = zhMeta.raceTime ?? raceTime;
    }
  } catch {
    // keep parsed values
  }
  let chineseNameByNo = new Map<number, string>();
  try {
    chineseNameByNo = await fetchHkjcChineseNameByNo(parsed);
  } catch {
    chineseNameByNo = new Map<number, string>();
  }
  let zhRunners: RaceCardRunner[] = [];
  try {
    zhRunners = await fetchZhRaceCardRunnersById(parsed);
  } catch {
    zhRunners = [];
  }
  let weatherContext: ModelContext["weather"];
  try {
    const weather = await getCurrentWeather();
    weatherContext = {
      temperatureC: weather.temperatureC,
      humidity: weather.humidity,
    };
  } catch {
    weatherContext = {
      temperatureC: null,
      humidity: null,
    };
  }

  const entriesRaw: HorsePrediction[] = [];

  if (zhRunners.length > 0) {
    const maxRating = Math.max(...zhRunners.map((item) => item.rating || 0), 1);
    for (const runner of zhRunners) {
      const ratingGap = Math.max(0, maxRating - runner.rating);
      const oddsFromRating = Number((2.5 + ratingGap * 0.35).toFixed(1));

      entriesRaw.push({
        horseNo: runner.horseNo,
        horseCode: runner.horseCode,
        horseName: runner.horseCode ?? runner.horseNameZh,
        horseNameZh: runner.horseNameZh,
        jockey: runner.jockey,
        trainer: runner.trainer,
        draw: runner.draw,
        weight: runner.weight,
        oddsWin: oddsFromRating,
        winProb: 0,
        placeProb: 0,
        confidence: "low",
        factors: [],
      });
    }
  } else {
    $("tr").each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((__, td) => $(td).text().replace(/\s+/g, " ").trim())
        .get();

      if (cells.length < 10) {
        return;
      }

      const rank = parseNumber(cells[0], Number.NaN);
      const horseNo = parseNumber(cells[1], Number.NaN);
      if (!Number.isFinite(rank) || !Number.isFinite(horseNo)) {
        return;
      }

      const horseNameRaw = cells[2] ?? "";
      const horseCode = extractHorseCode(horseNameRaw);
      const odds = parseNumber(cells[cells.length - 1], 99);
      const draw = parseNumber(cells[7], 0);
      const weight = parseNumber(cells[5], 0);
      const jockey = cells[3] ?? "N/A";
      const trainer = cells[4] ?? "N/A";

      if (!horseNameRaw) {
        return;
      }

      entriesRaw.push({
        horseNo,
        horseCode,
        horseName: normalizeHorseName(horseNameRaw),
        horseNameZh: chineseNameByNo.get(horseNo) ?? (horseCode ? horseNameZhByCode[horseCode] : undefined),
        jockey,
        trainer,
        draw,
        weight,
        oddsWin: odds,
        winProb: 0,
        placeProb: 0,
        confidence: "low",
        factors: [],
      });
    });
  }

  const dedupMap = new Map<number, HorsePrediction>();
  for (const entry of entriesRaw) {
    if (!dedupMap.has(entry.horseNo)) {
      dedupMap.set(entry.horseNo, entry);
    }
  }

  try {
    const liveOdds = await fetchLiveWinPlaceOddsByRace(parsed);
    for (const entry of dedupMap.values()) {
      const winOdds = liveOdds.winByNo.get(entry.horseNo);
      const placeOdds = liveOdds.placeByNo.get(entry.horseNo);
      if (winOdds != null) {
        entry.oddsWin = winOdds;
      }
      if (placeOdds != null) {
        entry.oddsPlace = placeOdds;
      }
    }
  } catch {
    // Keep existing odds as fallback when live WIN/PLA API is temporarily unavailable.
  }

  await refreshLiveConnectionStats();

  const entries = applyFeatureModel(Array.from(dedupMap.values()), {
    going,
    weather: weatherContext,
  });
  if (entries.length === 0) {
    return undefined;
  }

  return {
    id,
    date: parsed.date,
    course: parsed.course,
    raceNo: parsed.raceNo,
    className,
    distanceM,
    raceTime,
    going,
    updatedAt: new Date().toISOString(),
    entries,
  };
}

async function fetchLiveRacesByDate(date: string): Promise<Race[]> {
  const meta = await fetchEntriesRaceMetaByDate(date);
  if (!meta || meta.races.length === 0) {
    return [];
  }

  const races = await Promise.all(
    meta.races.map(async (item) => {
      let zhMeta: RaceCardMeta | undefined;
      try {
        zhMeta = await fetchZhRaceCardMetaById({ date, course: meta.course, raceNo: item.raceNo });
      } catch {
        zhMeta = undefined;
      }

      let raceTime: string | undefined;
      try {
        raceTime = await fetchRaceTimeById({ date, course: meta.course, raceNo: item.raceNo });
      } catch {
        raceTime = undefined;
      }

      return {
        id: `${date}-${meta.course}-${item.raceNo}`,
        date,
        course: meta.course,
        raceNo: item.raceNo,
        className: zhMeta?.className ?? item.className,
        distanceM: zhMeta?.distanceM ?? item.distanceM,
        raceTime: zhMeta?.raceTime ?? raceTime,
        going: zhMeta?.going ?? "待公布",
        updatedAt: new Date().toISOString(),
        entries: [],
      } satisfies Race;
    }),
  );

  return races.sort((a, b) => a.raceNo - b.raceNo);
}

function getMockRacesByDate(date: string): Race[] {
  return raceData.filter((race) => race.date === date);
}

function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export async function getRacesWithNextFallback(
  requestedDate: string,
  lookAheadDays = 14,
): Promise<{
  requestedDate: string;
  effectiveDate: string;
  fallbackApplied: boolean;
  races: Race[];
}> {
  const todayRaces = await getRacesByDate(requestedDate);
  if (todayRaces.length > 0) {
    return {
      requestedDate,
      effectiveDate: requestedDate,
      fallbackApplied: false,
      races: todayRaces,
    };
  }

  for (let offset = 1; offset <= lookAheadDays; offset += 1) {
    const nextDate = addDays(requestedDate, offset);
    const nextRaces = await getRacesByDate(nextDate);
    if (nextRaces.length > 0) {
      return {
        requestedDate,
        effectiveDate: nextDate,
        fallbackApplied: true,
        races: nextRaces,
      };
    }
  }

  return {
    requestedDate,
    effectiveDate: requestedDate,
    fallbackApplied: false,
    races: [],
  };
}

export async function getRacesByDate(date: string): Promise<Race[]> {
  if (USE_MOCK_DATA) {
    return getMockRacesByDate(date);
  }

  if (!USE_LIVE_HKJC) {
    return [];
  }

  try {
    const live = await fetchLiveRacesByDate(date);
    return live;
  } catch {
    return [];
  }
}

export async function getRaceById(id: string): Promise<Race | undefined> {
  if (USE_MOCK_DATA || !USE_LIVE_HKJC) {
    const mockRace = raceData.find((race) => race.id === id);
    if (!mockRace) {
      return undefined;
    }
    return {
      ...mockRace,
      entries: applyFeatureModel(mockRace.entries, {
        going: mockRace.going,
        weather: { temperatureC: 28, humidity: 76 },
      }),
    };
  }

  try {
    const live = await fetchHkjcRaceById(id);
    if (live) {
      return live;
    }
  } catch {
    const mockRace = raceData.find((race) => race.id === id);
    if (!mockRace) {
      return undefined;
    }
    return {
      ...mockRace,
      entries: applyFeatureModel(mockRace.entries, {
        going: mockRace.going,
        weather: { temperatureC: 28, humidity: 76 },
      }),
    };
  }

  const mockRace = raceData.find((race) => race.id === id);
  if (!mockRace) {
    return undefined;
  }
  return {
    ...mockRace,
    entries: applyFeatureModel(mockRace.entries, {
      going: mockRace.going,
      weather: { temperatureC: 28, humidity: 76 },
    }),
  };
}

export async function getPredictionsByRaceId(id: string): Promise<HorsePrediction[]> {
  const race = await getRaceById(id);
  if (!race) {
    return [];
  }

  return [...race.entries].sort((a, b) => b.winProb - a.winProb);
}

export async function getDataLatencyStatus() {
  const latest = raceData.reduce((acc, race) => {
    return acc > race.updatedAt ? acc : race.updatedAt;
  }, raceData[0]?.updatedAt ?? new Date().toISOString());

  return {
    source: USE_MOCK_DATA ? "mock" : "live+fallback",
    latestUpdate: latest,
    stale: false,
  };
}

export async function getCurrentWeather(): Promise<WeatherCurrent> {
  if (USE_MOCK_DATA) {
    return {
      source: "mock",
      updateTime: new Date().toISOString(),
      temperatureC: 28,
      humidity: 76,
      icon: null,
    };
  }

  try {
    const url = `${HKO_BASE}?dataType=rhrread&lang=tc`;
    const payload = await fetchJson<{
      updateTime?: string;
      icon?: number[];
      humidity?: { data?: Array<{ value?: number }> };
      temperature?: { data?: Array<{ place?: string; value?: number }> };
    }>(url);

    const tempHKO = payload.temperature?.data?.find((item) => item.place === "香港天文台")?.value;
    const tempAny = payload.temperature?.data?.[0]?.value;
    const humidity = payload.humidity?.data?.[0]?.value ?? null;

    return {
      source: "hko",
      updateTime: payload.updateTime ?? new Date().toISOString(),
      temperatureC: tempHKO ?? tempAny ?? null,
      humidity,
      icon: payload.icon?.[0] ?? null,
    };
  } catch {
    return {
      source: "mock",
      updateTime: new Date().toISOString(),
      temperatureC: 28,
      humidity: 76,
      icon: null,
    };
  }
}

export async function getNineDayForecast(): Promise<NineDayForecast> {
  if (USE_MOCK_DATA) {
    return {
      source: "mock",
      updateTime: new Date().toISOString(),
      days: [],
    };
  }

  try {
    const url = `${HKO_BASE}?dataType=fnd&lang=tc`;
    const payload = await fetchJson<{
      updateTime?: string;
      weatherForecast?: Array<{
        forecastDate?: string;
        week?: string;
        forecastMintemp?: { value?: number };
        forecastMaxtemp?: { value?: number };
        forecastWeather?: string;
      }>;
    }>(url);

    return {
      source: "hko",
      updateTime: payload.updateTime ?? new Date().toISOString(),
      days:
        payload.weatherForecast?.map((item) => ({
          date: item.forecastDate ?? "",
          week: item.week ?? "",
          minTempC: item.forecastMintemp?.value ?? 0,
          maxTempC: item.forecastMaxtemp?.value ?? 0,
          weather: item.forecastWeather ?? "",
        })) ?? [],
    };
  } catch {
    return {
      source: "mock",
      updateTime: new Date().toISOString(),
      days: [],
    };
  }
}
