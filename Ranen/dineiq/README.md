# DineIQ Analytics — MenuMatrix Dining Intelligence

A **frontend-only prototype** of a restaurant intelligence platform, built for the fictional
restaurant brand **Maison Ember** (Karachi, PK). It ships two connected experiences:

| Experience | Entry point | What it is |
| --- | --- | --- |
| **Customer store** | `/` | Browse the menu, customise items, cart, 6-step checkout, order tracking, account area |
| **Owner dashboard** | `/admin` | 16 analytics modules behind a full admin shell (Menu Intelligence is the centrepiece) |

> **This is a UI prototype.** There is no backend, no database, no dataset, no API, no
> authentication, no payment processing and no analytics engine. Every number, chart,
> classification, forecast and recommendation comes from small hardcoded mock objects in
> `src/lib/data/` and exists purely to make the interface look and behave realistically.
> Analytics panels are labelled "Demo", forecasts are labelled "Demo Forecast /
> Illustrative Forecast", and recommendations are labelled "Illustrative recommendation".

---

## Running it

```bash
cd dineiq
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview
```

`npx tsc --noEmit` passes clean; `npx vite build` succeeds (the only warning is the expected
">500 kB chunk" advisory for a single-bundle prototype).

---

## Stack

React 19 · TypeScript · Vite 5 · Tailwind CSS 3.4 · React Router 7 · Recharts 3 · Lucide (icons)
No other runtime dependencies.

---

## Design system

| Token | Value | Use |
| --- | --- | --- |
| `canvas` / `ink` | warm off-white `#FAF8F5` / deep charcoal `#1C1917` | page ground, primary text |
| `ember` | terracotta `#C4552A` scale | primary accent, CTAs, active states |
| `sage` / `clay` / `gold` / `sky` | supporting accents | classification and status semantics |
| `line` | `#E7E1DA` | card and table borders |

- **Type** — Fraunces (display) + Inter (UI).
- **Components** — white cards, `rounded-2xl`, hairline borders, sparing soft shadows
  (`shadow-card` / `shadow-lift` / `shadow-pop`). No heavy gradients, no glassmorphism.
- **Reusable layer** — `src/components/ui/` (primitives, overlays, states, data table),
  `src/components/charts.tsx` (tooltip, trend, bar, line, area, donut, scatter, radar, sparkline),
  `src/components/shared.tsx` (KPI cards, filter bar, export menu, demo note, food image with
  monogram fallback).
- **Photography** — 10 AI-generated food images in `public/img/`; every `FoodImage` falls back to a
  branded monogram tile if a file is missing, so no broken images.

---

## Customer store — `/`

| Route | Page |
| --- | --- |
| `/` | Home — hero, categories, featured dishes, offers, specialties, reviews, hours, location, footer |
| `/menu` | Menu browsing — search, categories, sort, veg/spicy/dietary filters, grid/list toggle, loading + empty + no-results states |
| `/menu/:slug` | Item detail — gallery, ingredients, allergens, portions, size, add-ons, quantity, special instructions, related / paired items |
| `/cart` | Cart — quantity stepper, remove, save for later, promo codes, full bill breakdown, empty state, removal confirm |
| `/checkout` | 6 steps — customer → fulfilment → address → payment → review → confirmation (COD / card / wallet, visual only) |
| `/order-confirmed/:number` | Order confirmation |
| `/track/:number` | Order tracking timeline |
| `/account/*` | Account — profile, orders + order detail, addresses, favourites, saved payments, notifications, preferences, logout confirm |
| `/offers` `/about` `/contact` | Static content pages |

**Promo codes** that work in the demo: `PIZZA20`, `BURGERFRIES`, `SWEET3000`, `WELCOME10`, `FREESHIP`.
Currency is **PKR / Rs.** throughout, with prices realistic for Pakistan.

---

## Owner dashboard — `/admin`

Shell: collapsible fixed sidebar grouped into *Operations · Menu Intelligence · Performance ·
Decisions · System*, plus top nav with module search, breadcrumbs, date-range selector, location
selector, notifications dropdown, help, profile menu, print/export and a "View store" link. Fully
responsive with a mobile drawer and bottom-bar navigation on the store side.

| Route | Module |
| --- | --- |
| `index` | Overview — KPIs, revenue trend, channel mix, top sellers, category revenue |
| `orders` | Orders — filters, live-style table, order drawer, status changes |
| `menu` | Menu Management — availability toggles, pricing, 86-ing, categories |
| `menu-intelligence` | **Menu Intelligence** — the core module |
| `customers` | Customers — segments, RFM-style table, lifetime value, retention |
| `market-basket` | Market Basket — item pairings, support/confidence/lift, bundle suggestions |
| `forecasting` | Demand Forecasting — "Demo Forecast" horizons, confidence bands, accuracy panel |
| `inventory` | Inventory & Wastage — stock levels, wastage trend, causes, reorder list |
| `pricing` | Pricing Intelligence — elasticity illustration, margin by item, price tests |
| `promotions` | Promotions — active/scheduled/expired, promotion-trap detection, builder modal |
| `ratings` | Ratings & Reviews — distribution, trend, themes, review drawer with reply box |
| `anomalies` | Sales Anomalies — severity-filtered alert feed, timeline, dismiss / mark reviewed |
| `locations` (+ `/locations/:id`) | Locations — branch comparison and per-branch detail |
| `recommendations` | Recommendations — prioritised action cards, save / dismiss / bookmark |
| `reports` | Reports — report library, printable document preview, scheduled reports |
| `settings` | Settings — 10 sections (profile, branches, hours, currency & tax, users & roles, …) |

### Menu Intelligence detail

- Four **static demonstration classifications**: **Profit Driver**, **Volume Driver**,
  **Hidden Opportunity**, **Low Performer** — each with badge, description, examples, what it
  means, metrics and visual distinction.
- Performance table: item, category, units, revenue, estimated cost, contribution margin, profit %,
  rating, repeat purchase, wastage, classification, trend, actions.
- Charts: revenue vs profitability scatter, performance matrix, category comparison, profitability
  distribution, sales trend, margin comparison.
- Item detail view with **9 tabs**.

---

## UI states included

Normal · loading (skeletons for tables, cards, charts) · empty · error · no-results · no-data ·
modal · drawer · confirmation dialog · toast · dropdown · active filters · mobile nav · disabled ·
validation.

Analytics pages with no data show:

> **No analytical data available yet.**
> Connect your restaurant data in a future version to unlock insights.

---

## Source layout

```
src/
  components/   ui/ (primitives, overlay, states, table) · charts.tsx · shared.tsx
                admin/PageHeader.tsx · store/DishCard.tsx
  layouts/      StoreLayout.tsx · AdminLayout.tsx
  lib/data/     menu.ts (39 items, 8 categories) · store.ts · analytics.ts
  lib/utils.ts  cn, pkr, num, pct, timeAgo, hash, pick, preference helpers
  pages/store/  Home, MenuPage, ItemDetail, CartPage, Checkout, OrderConfirmation,
                OrderTracking, Account, accountPages, StaticPages
  pages/admin/  Overview, Orders, MenuManagement, MenuIntelligence, Customers, MarketBasket,
                Forecasting, Inventory, Pricing, Promotions, Ratings, Anomalies, Locations,
                Recommendations, Reports, Settings
  store/app.tsx CartProvider · FavouritesProvider · WorkspaceProvider (local state only)
public/img/     10 generated food photographs
```

All interactions (cart, favourites, filters, modals, toasts, tabs, theme, saved preferences) run on
React local state. Nothing is sent anywhere and nothing persists beyond the browser tab.
