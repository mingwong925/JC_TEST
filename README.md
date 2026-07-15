## HK Racing Predictor MVP

Personal-use race analysis dashboard MVP built with Next.js App Router.

### Current Scope
- Race list page
- Race detail page with feature-v1 Win/Place probabilities
- API endpoints for races, predictions, odds trend, weather, and data latency
- Compliance and source documentation skeleton

### Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### API Endpoints (MVP)
- `/api/races?date=2026-07-14`
- `/api/race/2026-07-14-ST-1`
- `/api/race/2026-07-14-ST-1/predictions`
- `/api/race/2026-07-14-ST-1/odds-trend`
- `/api/weather/current`
- `/api/weather/forecast`
- `/api/health/data-latency`

### Important Notes
- Default mode is live providers with fallback to in-repo mock data.
- Prediction model currently uses feature fusion: recent form + odds + head-to-head + jockey change.
- Horse names prefer Chinese (when available), then fallback to English.
- Use `.env.local` to switch behavior:
	- `USE_MOCK_DATA=true` forces mock mode
	- `USE_LIVE_HKJC=false` disables HKJC live fetch
- See `docs/data-sources.md` for source attribution and adapter details.
- See `docs/compliance.md` for compliance notices and operational guardrails.

### Environment Variables
Copy `.env.example` into `.env.local` and fill the values as needed.

### Next Step
- Persist snapshots to Supabase
- Run scheduled ingest/predict workflows in GitHub Actions
- Replace synthetic odds trend with true historical snapshots
