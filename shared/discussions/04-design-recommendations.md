# 04 — Design Recommendations

- **Date**: 2026-04-08
- **Source**: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
- **Author**: Claude Code
- **Status**: Pending Codex review

## Background

[awesome-design-md](https://github.com/VoltAgent/awesome-design-md) curates 58 DESIGN.md design system documents extracted from real websites. Each follows the [Google Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/overview/) and covers color, typography, component styles, layout principles, shadow levels, responsive behavior, and other complete design tokens.

This document selects the most relevant design resources for the Online Judge project's functional modules (problem display, submission status, leaderboard, user profile, contest list, discussion area, etc.) and explains each recommendation.

---

## Recommendations Overview

| Rank | Design System | Primary Module | Rationale |
|------|---------------|----------------|-----------|
| 1 | **Linear** | Full-site visual framework | Ultra-precise dark developer-tool aesthetic, matches OJ's technical user base |
| 2 | **Vercel** | Leaderboard, data tables, card lists | Shadow-as-border multi-layer shadow system for structured rank data |
| 3 | **Supabase** | Code editor, submission details, tech panels | Dark + emerald accent, suits code and judging result display |
| 4 | **Sentry** | Submission status panel, error tracking, dashboards | Data-dense dark dashboard for judging results and error analysis |
| 5 | **Notion** | Problem display, discussion area | Warm minimalist reading typography for long-form problem descriptions |
| 6 | **Stripe** | Leaderboard, statistics panels, data tables | Financial-grade precision for rank and contest statistics |
| 7 | **ClickHouse** | Performance metrics, live leaderboard, contest dashboards | Extreme high-contrast data display for contest live views |
| 8 | **PostHog** | User profile, personal statistics, dashboards | Warm friendly analytics panel for personal data visualization |
| 9 | **Cursor** | Code view, problem detail page | Three-font system (gothic + serif + monospace) for code alongside descriptions |

---

## Detailed Recommendations

### 1. Linear — Full-Site Visual Framework

**Repo path**: `design-md/linear.app/DESIGN.md`

Linear is an ultra-refined dark design system built for engineers. OJ's core users (students and teachers) are essentially developer personas, making Linear's dark-native aesthetic a strong fit.

Key tokens for OJ:

- **Near-black background `#08090a`** — Reduced eye strain during long coding/judging sessions
- **Inter Variable + OpenType `"cv01", "ss03"`** — High-readability sans-serif for problem descriptions
- **Berkeley Mono monospace** — Natural companion for code display and judging output
- **Semi-transparent white borders `rgba(255,255,255,0.05~0.08)`** — Fine separators for dense data lists (problems, submissions)
- **Brand indigo `#5e6ad2` / `#7170ff`** — OJ can adopt as accent color (e.g., Accepted status)
- **Five-level text brightness ladder** (`#f7f8f8` to `#62666d`) — Maps naturally to: problem title, description, time limit, tag
- **Pill badges (9999px radius)** — Natural for difficulty labels (Easy/Medium/Hard), AC rates, language tags

**OJ modules**: Full-site framework, nav bar, sidebar, problem list, submission list

**Caveat**: Linear is extremely restrained (minimal color). If OJ needs richer visual layers (difficulty color coding), extend from this base.

---

### 2. Vercel — Leaderboard and Data Tables

**Repo path**: `design-md/vercel/DESIGN.md`

Vercel's multi-layer shadow-stack technique (shadow-as-border) is particularly suited to structured data display in leaderboard pages.

Key tokens for OJ:

- **Shadow-as-border `box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.08)`** — Refined row separators in leaderboard
- **Geist font family + extreme negative tracking (-2.4px at 48px)** — Compressed ranking numbers with visual impact
- **Three workflow colors** — Ship Red (`#ff5b4f`), Preview Pink (`#de1d8d`), Develop Blue (`#0a72ef`) map to: Wrong Answer, Pending/Running, Accepted
- **Metric cards** — Large number + description card pattern for "Solved", "AC Rate", "Rank"
- **White background + minimal typography** — High information density for quick-scan pages like leaderboard

**OJ modules**: Leaderboard, contest scoreboard, user stats panel, homepage data display

**Pairing with Linear**: Use Vercel's light theme for public pages (leaderboard, contests), Linear's dark theme for code editor and admin panels.

---

### 3. Supabase — Code Editor and Submission Details

**Repo path**: `design-md/supabase/DESIGN.md`

Supabase's developer-centered dark platform with emerald accent system fits OJ's code submission scenarios.

Key tokens for OJ:

- **Emerald brand `#3ecf8e` / `#00c573`** — Natural mapping to Accepted status, core positive feedback color
- **Source Code Pro uppercase tech labels** — For judging result labels: TIME_LIMIT, MEMORY_LIMIT, RUNTIME_ERROR
- **HSL color token system + alpha channel** — Semi-transparent green borders for highlighting AC problem rows
- **Circular font extreme hero line-height 1.00** — For contest countdown, large rank numbers
- **Pill primary button (9999px)** — "Submit Code" button style
- **Border depth system** (`#242424` to `#363636`) — Depth without shadows for code panels and judging results

**OJ modules**: Code editor panel, submission detail page, judging result display, problem pass status markers

---

### 4. Sentry — Submission Status Panel and Judging Dashboard

**Repo path**: `design-md/sentry/DESIGN.md`

Sentry's data-dense dark dashboard design closely matches OJ's judging result analysis scenario.

Key tokens for OJ:

- **Deep purple-black `#1f1633`** — Warmer than Linear's pure dark, suitable for extended judging panel use
- **Lemon green accent `#c2ef4e`** — Highlight AC status, high contrast against purple
- **Coral/pink accents `#ffb287` / `#fa7faa`** — Map to WA and RE status respectively
- **Glassmorphism `blur(18px) saturate(180%)`** — Floating judging detail panels
- **Inset-shadow buttons** — Submit button press feedback
- **Monaco monospace** — Judging output and compilation error display
- **Uppercase + letter-spacing 0.2px labels** — Status labels: ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED

**OJ modules**: Real-time submission status panel, judging result detail, error tracking panel, admin judging monitor

**Note**: Sentry's purple tone is heavy. Use only for judging-related data panels, not full-site.

---

### 5. Notion — Problem Display and Discussion Area

**Repo path**: `design-md/notion/DESIGN.md`

OJ problem pages are essentially long-form reading experiences. Notion's warm minimalist typography is ideal.

Key tokens for OJ:

- **Warm neutral scale** (`#f6f5f4` warm white, `#31302e` warm black, `#615d59` warm gray) — Comfortable for extended reading
- **NotionInter negative tracking** — Compressed typography for problem titles
- **Ultra-thin borders `1px solid rgba(0,0,0,0.1)`** — Separator between problem description and code area
- **Multi-layer shadow stack (single layer opacity <= 0.05)** — Soft floating feel for problem and discussion cards
- **Warm white / pure white alternating backgrounds** — Visual separation between description area and code area
- **Notion Blue `#0075de`** — Hyperlink color in problems (references, external links)
- **Pill status labels** — Difficulty labels, algorithm category tags (DP/Graph/Tree)
- **Four weight system** (400/500/600/700) — Clear hierarchy: problem number > title > section > body > examples

**OJ modules**: Problem display page, solution editor, discussion posts, blog/wiki, help docs

---

### 6. Stripe — Leaderboard and Contest Statistics

**Repo path**: `design-md/stripe/DESIGN.md`

Stripe's financial data display capability translates well to leaderboard and contest statistics — rankings are "financial data" requiring precision.

Key tokens for OJ:

- **Custom sohne-var font + `"ss01"` stylistic set** — Distinctive leaderboard typography
- **Weight 300 (ultra-light) large titles** — Elegant leaderboard headers
- **Blue multi-layer shadows `rgba(50,50,93,0.25)`** — Precise depth for leaderboard cards
- **Deep sea blue `#061b31` text** — Ranking numbers with premium feel
- **Tabular numbers `"tnum"`** — Essential for column-aligned rank, AC count, time data
- **Success Green `#15be53`** — AC status marker
- **4-8px conservative border-radius** — Formal feel for leaderboard rows
- **Deep brand area `#1c1e54`** — Contest page header background

**OJ modules**: Leaderboard page, contest statistics panel, admin data reports, scoring details

---

### 7. ClickHouse — Contest Live Dashboard and Performance Metrics

**Repo path**: `design-md/clickhouse/DESIGN.md`

ClickHouse's extreme high-contrast design (neon yellow-green `#faff69` on pure black `#000000`) suits contest live leaderboard displays and scenarios requiring visual impact.

Key tokens for OJ:

- **Neon yellow-green `#faff69` on pure black** — Contest live leaderboard leader highlight
- **Inter 900 (Black) + 96px hero titles** — Contest names, live countdown
- **Forest green `#166534` CTA buttons** — "Join Contest", "Submit Code"
- **Large metric number display** — "X submissions", "Y% AC rate", "Z minutes remaining"
- **Inset shadows (press effect)** — Current user row depression in leaderboard
- **Uppercase wide-tracking labels 1.4px** — Contest status: UPCOMING / RUNNING / ENDED

**OJ modules**: Contest live leaderboard, contest hero, countdown, annual/monthly stats

**Note**: ClickHouse style is extreme. Use only for contest live screens and high-impact scenarios, not full-site.

---

### 8. PostHog — User Profile and Personal Statistics

**Repo path**: `design-md/posthog/DESIGN.md`

PostHog's warm, anti-traditional analytics aesthetic fits OJ's user profile — it shows data with warmth, not coldness.

Key tokens for OJ:

- **Warm sage/olive green primary** — User profiles should feel inviting, not cold
- **IBM Plex Sans Variable** — Technical credibility with human warmth
- **Hidden brand orange `#F54E00` (hover only)** — Progress bars reveal details on hover
- **Warm parchment background `#fdfdf8`** — User profile warm base
- **Hand-drawn illustration style** — OJ achievement badges and milestones
- **Content-dense edit layout** — Submission history, stats, contest participation records
- **Extra-large body line-height (1.50-1.71)** — Long-form profile/bio reading

**OJ modules**: User profile, personal statistics panel, achievement system, learning progress

---

### 9. Cursor — Code View and Problem Detail

**Repo path**: `design-md/cursor/DESIGN.md`

Cursor's three-font system (gothic display + serif body + monospace code) maps precisely to OJ problem page's three content types: title, description, code/examples.

Key tokens for OJ:

- **CursorGothic (display) + jjannon (body) + berkeleyMono (code)** — Perfect for problem title + description + code three-section layout
- **Warm cream background `#f2f1ed`** — Warm tone for problem reading
- **oklab color space borders** — More natural visual separation between description, examples, hints
- **AI Timeline four-color system** — Maps to judging flow: compile -> run -> compare -> judge
- **Orange accent `#f54e00`** — "Submit Code" primary button, important markers
- **Hover-to-red `#cf2d56`** — WA status visual feedback

**OJ modules**: Problem detail page (display + body + code), solution pages, code comparison views

---

## Module to Recommendation Mapping

| OJ Module | Primary | Secondary | Rationale |
|-----------|---------|-----------|-----------|
| Full-site visual framework | Linear | Vercel | Dark-native, developer-tool feel, precision |
| Problem display page | Notion | Cursor | Long-text reading, warm typography, content hierarchy |
| Problem detail (with code) | Cursor | Supabase | Three-font mapping for title/description/code |
| Code editor panel | Supabase | Linear | Dark + monospace + terminal aesthetic |
| Submission status / judging results | Sentry | Supabase | Data-dense dashboard + status colors |
| Leaderboard | Vercel | Stripe | Precision data display + multi-layer shadows + tabular numbers |
| Contest live dashboard | ClickHouse | -- | Extreme high contrast + visual impact |
| Contest statistics panel | Stripe | Vercel | Financial-grade precision + tabular numbers |
| User profile | PostHog | Notion | Warm analytics panel + personal data visualization |
| Discussion / blog | Notion | PostHog | Content editing typography + warm reading experience |
| Admin dashboard | Linear | Sentry | Engineer-grade dark dashboard |
| Contest list / homepage | Linear | ClickHouse | Clear list + status labels |

---

## Implementation Strategy

### Layered Approach

1. **Base layer**: Adopt Linear's dark visual framework as the full-site base (backgrounds, nav, sidebar, common components)
2. **Scenario layer**: Overlay each module's recommended design system:
   - Problem areas: Notion's warm typography tokens
   - Code areas: Supabase's terminal aesthetic
   - Leaderboard: Vercel/Stripe's precision data display
   - Contest live: ClickHouse's high-contrast impact
   - User profile: PostHog's warm panel style

### Unified Status Color Mapping

| Status | Color | Source | Usage |
|--------|-------|--------|-------|
| Accepted | `#3ecf8e` (Supabase Green) | Supabase | AC status, pass marker |
| Wrong Answer | `#cf2d56` (Cursor Error) | Cursor | WA status, error marker |
| Pending/Running | `#0a72ef` (Vercel Develop Blue) | Vercel | Waiting, running |
| Time Limit | `#ffb287` (Sentry Coral) | Sentry | TLE status |
| Runtime Error | `#fa7faa` (Sentry Pink) | Sentry | RE status |
| Easy | `#10b981` (Linear Emerald) | Linear | Easy problem label |
| Medium | `#F7A501` (PostHog Gold) | PostHog | Medium problem label |
| Hard | `#ff5b4f` (Vercel Ship Red) | Vercel | Hard problem label |

### Next Steps

1. Submit to Codex for review
2. Finalize design system combination
3. Download selected DESIGN.md files to `references/design-md/`
4. Create OJ project's unified `DESIGN.md` merging best tokens from each system
5. Apply during frontend P5 (contests/leaderboard) and P2 (problem management) phases

---

## Systems Reviewed but Not Recommended

| System | Reason |
|--------|--------|
| Airbnb | Travel marketplace aesthetic, doesn't match OJ technical scenario |
| Apple | Consumer-grade product aesthetic, too premium for developer tools |
| Coinbase/Kraken/Revolut | Financial trading interface, functional gap too large |
| Figma/Clay/Framer | Design tool aesthetics, creative direction mismatch |
| BMW/Ferrari/Tesla | Car brand pure showcase pages, no functional component reference |
| Ollama/Warp | Ultra-minimal terminal aesthetic, insufficient component coverage |
| Intercom | Customer service chat interface, scenario mismatch |
