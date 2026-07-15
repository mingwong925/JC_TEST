# Data Sources (MVP)

## Weather
- HKO Open Data API
- Endpoints used in MVP:
  - `rhrread` (current weather report)
  - `fnd` (9-day forecast)

## Race Core Data
- HKJC local results page adapter (live fetch):
  - date/course race list extraction
  - race detail parsing (horse, jockey, trainer, odds)
- Automatic fallback:
  - if live source fails, use local mock data

## Prediction Features (feature-v1)
- oddsScore: implied probability from current win odds
- recentFormScore: recent race form score from history cache
- headToHeadScore: prior matchups against current field rivals
- jockeyChanged / previousJockey: detects rider switch vs prior run

## Horse Name Display
- Use Chinese horse name when available from zh-hk source
- Fallback to local mapping by horse code
- Fallback to English horse name when Chinese name is unavailable

## Attribution
- Every page should display source label and update timestamp.
