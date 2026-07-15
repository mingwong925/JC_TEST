# Compliance Notes (MVP)

## Product Positioning
- This website is for informational race analysis only.
- No direct betting link, no bet placement function.

## Required Frontend Notice
- "For informational analysis only. Not betting advice."
- "18+ only. Please gamble responsibly."
- Show data source and last update timestamp.

## Data Source Policy
- Priority: official open data with explicit reuse terms.
- HK race pages are used in low-frequency mode only in MVP.
- Always keep adapter design to switch to licensed feeds.

## Operational Guardrails
- Cache race pages and avoid high-frequency requests.
- Add graceful degradation when source is unavailable.
- Keep an internal log for source errors and retries.
