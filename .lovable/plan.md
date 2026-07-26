
## Goal
Build "Radiocom Analytics Hub": a read-only marketing dashboard that reads directly from the Google Sheet (ID `1_mljmLtXDrk90g055harTstt06_VvSurYuCpfrag4Vs`) via the linked Google Sheets connector, computes derived KPIs client-side, and exports the current view to Excel.

## Findings from inspecting the sheet (important)
The sheet does NOT match the unified schema described in section 4 of the brief. Each tab has its own shape, so we need per-tab parsers rather than one universal loader:

- **Meta Ads** — daily-ish rows, columns: Date Start, Date Stop, Click (all), Impressions, Reach, Amount spent, Leads (Total), Cost Per Leads, Page Likes, Content Views, Video watches 25/50/75/100%, CTR, CPC, CPM, Post Engagement, Messaging Conversations Started. Well-structured; supports time filtering.
- **Google Ads** — headers start at column C: Impressions, Clicks, Cost, All conversions, Phone calls, Interactions, Search impression share, Video views, CTR, Avg CPC, Avg CPM, Engagements, Avg CPE, Avg CPV. Row 1 is a totals row; a "Date Start / Date Stop" sub-header appears in row 3. Needs custom parse.
- **Google Analytics** — mixed content: source rankings (Global Rank, Country Rank, visits) plus a Semrush-style keyword table (Keyword, KD, Position, Volume, Intent, CPC, URL, Traffic, etc). Not time-series; render as static reference tables.
- **Instagram Organic / Facebook Organic** — wide layout: repeating 3-column blocks per quarter (`Start date … End date …`) with metric label / value rows. Followers, reach, profile views, likes, shares etc. Requires block-wise parser keyed by quarter.
- **OLX** — no header row; per-product rows: Product name, Category, Price, Ad ID, Views, Favorites, Phone clicks, ?, CTR%.
- **SupermetricsQueries** — internal config, ignore.

Given this, the global "This Week / Last Week / Custom Range" filter only meaningfully applies to Meta Ads and (where date breakouts exist) Google Ads. Organic + GA + OLX tabs will show their native aggregation (quarterly for organic, all-time for OLX/GA) with a note; the time filter is disabled/greyed on those pages.

## Architecture

```text
src/
  routes/
    __root.tsx                (sidebar layout + theme toggle + global filter bar)
    index.tsx                 (Overview)
    meta-ads.tsx
    google-ads.tsx
    google-analytics.tsx
    facebook-insights.tsx
    instagram-insights.tsx
    olx.tsx
  lib/
    sheets.functions.ts       (createServerFn: fetch tab values via connector gateway)
    parsers/
      metaAds.ts, googleAds.ts, googleAnalytics.ts,
      organic.ts (fb+ig), olx.ts
    metrics.ts                (CPL, CTR, CPC helpers; sum-then-divide)
    dateFilter.ts             (This/Last Week/Month, Q1-Q4, YTD, Custom)
    excelExport.ts            (xlsx SheetJS wrapper)
  components/
    layout/{Sidebar,Topbar,GlobalFilter,ExportButton}.tsx
    kpi/KpiCard.tsx
    charts/{BarCompare,LineTrend,DonutSplit}.tsx (Recharts)
    ai/StrategicHelper.tsx    (calls src/lib/ai.functions.ts)
    tables/DataTable.tsx      (shadcn table + column sort/filter)
  lib/ai.functions.ts         (createServerFn -> Lovable AI Gateway, openai/gpt-5.5)
```

## Data flow
1. Server function `getSheetTab(tabName)` calls the Google Sheets connector gateway (`/v4/spreadsheets/{id}/values/{tab}`) using `LOVABLE_API_KEY` + `GOOGLE_SHEETS_API_KEY` env vars.
2. Each page's loader primes TanStack Query cache via `ensureQueryData` for its tab(s); component uses `useSuspenseQuery`.
3. Global filter is stored in URL search params (typed via TanStack Router search validators) so it survives reload and shareable links.
4. Client-side reducers apply the date filter to Meta Ads / Google Ads rows, then compute derived KPIs (CPL, CTR, CPC) as sum-then-divide per section 5.
5. Excel export serializes the exact filtered dataset (rows + computed totals row) for the active page.

## Page contents

- **Overview** – Blended KPI cards (Total Spend = Meta+Google, Total Leads, Blended CPL, Impressions), bar chart Spend vs Conversions across Meta/Google/OLX, Winners/Losers lists (cheapest CPL, highest CTR, worst CPL), AI Strategic Helper panel.
- **Meta Ads** – KPI row, spend/leads trend line, CTR/CPC/CPM small charts, campaign table with sort + export.
- **Google Ads** – KPI row, impressions/clicks/cost trend, search impression share gauge, table with export.
- **Google Analytics** – Two sections: Site rank cards (Global Rank, Country Rank, visits with change deltas) + Keyword rankings table (Position, KD, Volume, CPC, URL, Traffic share). No time filter.
- **Facebook Insights** – Quarter-selector; followers growth line across quarters + KPI cards per selected quarter.
- **Instagram Insights** – Same pattern as FB; profile followers, reach, profile views, likes, shares per quarter.
- **OLX** – Product table (Name, Category, Price, Views, Favorites, Phone clicks, CTR), sort/filter, per-product mini stats.

## Global controls
- Sticky top bar: brand mark, GlobalFilter (`This Week / Last Week / This Month / Last Month / Q1..Q4 / YTD / Custom`), ExportButton, theme toggle.
- Sidebar with 7 routes and Radiocom red accent for the active item.

## Design
Dark-first shadcn dashboard with bold red (`--primary`) + neutral slate palette. High-contrast KPI cards, monospace numerics for stat readability, compact scannable tables (zebra + subtle borders). Light mode uses the same tokens inverted. No sparkles/AI-generic look — a small "R" mark image as the app logo.

## AI Strategic Helper
- `src/lib/ai.functions.ts` server function accepts a compact JSON of current filtered KPIs and returns a natural-language analysis via Lovable AI Gateway (`openai/gpt-5.5`, non-streaming `generateText`). Rendered as markdown in the Overview panel with a "Regenerate" button.
- Surfaces 402/429 errors clearly.

## Non-goals
- No writes to the sheet.
- No auth/user accounts.
- No Yandex page (dropped — no Yandex tab in the sheet).
- Sheet schema is treated as fixed; column renames will require parser updates.

## Technical details
- Stack: TanStack Start + Router + Query (existing), Tailwind v4 + shadcn (existing), Recharts, `xlsx` (SheetJS) for export, `date-fns` for date math.
- Connector: `google_sheets` connection `std_01kyevaqkhfb0b5ev3qwht5gvn` linked to project via `standard_connectors--connect` before writing code.
- Server functions live in `src/lib/*.functions.ts`; secrets read from `process.env` inside handlers only.
- Search params for filter validated with Zod on each route.
- All money/number formatting via `Intl.NumberFormat` with Russian-locale friendly separators (sheet uses UZS-style).
