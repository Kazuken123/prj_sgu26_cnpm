# Admin workspace: visitor activity, daily work and collections

Open `/internal/today` after signing in. The first section is visitor analytics; the second is daily collections and staff work. This document covers the new local admin changes after frontend commit `93cea93`. The earlier [frontend-only backend handoff](./BACKEND_HANDOFF_FRONTEND_ONLY.md) does not include these analytics/reporting changes.

## Visitor analytics

| Dashboard figure | Actual definition |
| --- | --- |
| In the zoo now | Distinct anonymous browser identifiers whose latest accepted GPS heartbeat was inside the zoo boundary within the last 120 seconds. This always describes now, even when viewing a past reporting period. |
| Peak simultaneous activity | Maximum overlapping presence intervals during the selected period. It is not the total number of visitors or a sum of the chart columns. |
| App visits in the period | Distinct browser identifiers with a presence interval overlapping the period. An identifier lasts up to 30 days; it is not a unique-person identifier across devices or a whole year. |
| Entries | Number of presence intervals. Leaving the boundary or a GPS gap of 120 seconds starts a new interval on return. |
| Most / least visited locations | Distinct browser identifiers recorded at each POI during the period. The nearest active POI within its configured trigger radius (capped at 100 metres) is selected. Two accepted observations at least 20 seconds apart near the same POI confirm a visit. |
| Repeat visits | Number of confirmed POI visits, including returns after leaving the point. |

Day view uses hourly peaks; week and month use daily peaks; year uses monthly peaks. Weeks start Monday. All period boundaries use `Asia/Ho_Chi_Minh` (UTC+7), with an exclusive end boundary. The date picker chooses the day/week/month/year containing that date.

Active POIs with no observed visits remain in the rankings with zero, making the least-visited view useful. Historical periods before tracking began and future chart buckets show **no data**, not invented zeroes. Inactive POIs remain in a period's table when they had recorded visits. The table can be searched and sorted in either direction; each row opens the POI editor/detail page. Charts have keyboard-operable columns. CSV export contains the complete period summary and POI rankings, not just a visible slice.

### Coverage and collection

This is an estimate of **app visitors who opt in**, not everyone inside Thảo Cầm Viên. It cannot count people who do not use the app, decline analytics/GPS, leave the app suspended, share a device, or have inaccurate location. It must not be presented as gate attendance. Exact whole-zoo occupancy would require a separate gate entry/exit integration.

On `/explore`, visitors can enable **Đóng góp thống kê lượt tham quan bằng GPS**. Collection is off until selected and works with the free map, independently of payment. It can be turned off at any time. Turning it off sends an exit; if the network is unavailable, presence expires after 120 seconds. Closing or hiding the page also naturally ages out; the app does not claim to track in the background.

The browser sends every 30 seconds while visible and only with a location no more than 45 seconds old and accuracy of 40 metres or better. The server validates this again and decides inside/outside and nearest POI. Client-provided timestamps, POI IDs and attendance counts are not trusted. Browser location is still client-reported, so these are operational estimates, not fraud-resistant turnstile measurements.

The [boundary configuration](../backend/config/zoo-boundary.json) contains the complete saved OpenStreetMap outline for way 32735038, read on 2026-10-24, with source and ODbL attribution. It is not a surveyed boundary. The [geometry/period helper](../backend/utils/visitor-analytics.js) applies it. Review the outline and POI coordinates if the park layout changes.

Only token hashes, presence intervals and POI visit records are stored. Raw coordinates, names and email addresses are not stored in the analytics tables. A bounded in-memory rate limiter uses IP addresses transiently; the analytics database does not store them. Shared browser tabs reuse the same token, with browser locking when supported. Database row locking and heartbeat throttling prevent overlapping duplicate presence intervals for a token.

## Collections and staff workflow

- Owners see daily confirmed cash collections and totals by the staff member who confirmed receipt. Staff see their own confirmed payments and unpaid requests they created.
- Paid transactions use the actual payment confirmation date. Pending/failed transactions use their creation date. All dates use Vietnam midnight-to-midnight boundaries.
- Currency totals remain separate and decimal money is preserved. Retired online payments and cash payments without a confirming employee do not enter the collection totals.
- Pending requests, paid-but-unclaimed access, failed transactions and missing/currently failed audio content link directly to the next action.
- The transaction search and filters affect only the table; they do not change the day's totals. CSV export is a day summary, including staff and hourly totals where authorized.
- Staff open a transaction directly, review the receipt, explicitly confirm receipt of cash, and issue the six-digit customer code. The URL keeps the current session so refreshing reopens the same transaction. An uncertain create response retains its Idempotency-Key across reloads.
- Expired codes disappear from the display. An unsuccessful request never silently marks a payment paid or starts another sale.
- Activity logs default to today, use Vietnam dates and readable action labels. Technical health remains under Management. The old rolling revenue panel links to the daily collection report to avoid conflicting totals.

These figures are collections for narration access. They are not zoo entrance-ticket revenue, profit, staff attendance or a counted cash-drawer reconciliation.

## Files and deployment

### Backend files required for visitor analytics

| File | Change |
| --- | --- |
| [007_visitor_analytics.sql](../database/migrations/007_visitor_analytics.sql) | Adds four analytics tables and the start-of-collection timestamp; existing business tables are preserved. |
| [schema.store.js](../backend/stores/schema.store.js), [migrate.js](../backend/scripts/migrate.js) | Add idempotent migration 007 execution. |
| [zoo-boundary.json](../backend/config/zoo-boundary.json) | Saved zoo boundary and source attribution. |
| [visitor-analytics.js](../backend/utils/visitor-analytics.js) | Calendar windows, inside-boundary check, nearest POI and simultaneous-peak calculation. |
| [visitor-analytics.store.js](../backend/stores/visitor-analytics.store.js) | Transactional token registration, presence and POI visits; snapshot reporting queries. |
| [visitor-analytics.service.js](../backend/services/visitor-analytics.service.js) | Input validation, anonymous token hashing, internal access checks and report contract. |
| [visitor-analytics.router.js](../backend/routers/visitor-analytics.router.js) | Public telemetry endpoints with limits and protected aggregate reporting. |
| [server.js](../backend/server.js) | Mount the new analytics and reporting routers. |

Routes:

- `POST /api/analytics/sessions` returns an anonymous analytics token, with no listening or internal privileges.
- `POST /api/analytics/heartbeat`, with that token as Bearer, accepts `{latitude, longitude, accuracy, sampleAgeMs}` or `{exit:true}`.
- `GET /api/admin/visitor-analytics?period=day|week|month|year&date=YYYY-MM-DD` requires an active STAFF or ADMIN session and returns aggregate metrics only.

### Backend files required for daily collections

[operations.router.js](../backend/routers/operations.router.js), [operations.service.js](../backend/services/operations.service.js), [operations.validation.js](../backend/services/operations.validation.js), [operations.store.js](../backend/stores/operations.store.js), [business-day.js](../backend/utils/business-day.js), and the route registration in [server.js](../backend/server.js).

`GET /api/admin/operations` accepts `date`, `status`, `q` and `page`. The staff scope comes from the authenticated account, never a query parameter. This report uses existing payment/visit/content tables and requires no additional business-schema change.

### Frontend files

- [InternalDashboardPage.tsx](../frontend/src/pages/InternalDashboardPage.tsx) and [VisitorAnalyticsPanel.tsx](../frontend/src/components/VisitorAnalyticsPanel.tsx): dashboard, time filters, peaks, ranking, daily ledger and CSV actions.
- [visitorAnalytics.ts](../frontend/src/api/visitorAnalytics.ts), [operations.ts](../frontend/src/api/operations.ts): typed API contracts, period/report formatting and CSV export.
- [useVisitorPresence.ts](../frontend/src/hooks/useVisitorPresence.ts) and [ExplorePage.tsx](../frontend/src/pages/ExplorePage.tsx): opt-in location reporting.
- [InternalCashPage.tsx](../frontend/src/pages/InternalCashPage.tsx): guided counter workflow and reload recovery.
- [InternalNavigation.tsx](../frontend/src/components/InternalNavigation.tsx), [App.tsx](../frontend/src/App.tsx), [LoginPage.tsx](../frontend/src/pages/LoginPage.tsx): navigation and the new landing page.
- [InternalAuditLogsPage.tsx](../frontend/src/pages/InternalAuditLogsPage.tsx), [audit.ts](../frontend/src/api/audit.ts), [InternalMonitoringPage.tsx](../frontend/src/pages/InternalMonitoringPage.tsx): activity log and health/report consolidation.
- [internal.css](../frontend/src/internal.css), [main.tsx](../frontend/src/main.tsx): scoped responsive admin styling.

Deploy backend, migration and frontend together. A frontend-only deployment cannot collect or report analytics without the new backend routes.

From the project root:

```powershell
npm --prefix backend run db:migrate
npm --prefix frontend run build
# Restart your existing backend process using your normal service manager.
```

Migration 007 has already been applied to the local development database. It does not import fabricated history or create payments. Do not run a reset or replace the existing database to install this feature.

## Verification

```powershell
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix backend run lint
Set-Location backend
$env:RUN_DB_TESTS = '1'
node --test tests/operations.test.js tests/operations.integration.test.js tests/visitor-analytics.test.js tests/visitor-analytics.integration.test.js
```

The integration tests create and delete uniquely named disposable databases on a local MySQL server; they do not clear the application database. Coverage includes Vietnam day/week/month/year boundaries, leap years, overlapping presence peaks, expiry, exit, distinct-visitor counts, repeat visits, zero-visit POIs, geofencing, stale/inaccurate GPS rejection, SQL currency precision, staff scope, and browser opt-in behavior.
