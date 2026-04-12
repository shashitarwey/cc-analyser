# Suggested Features for CardVault

> Updated: April 2026. Based on full codebase analysis of all models, routes, pages, components, and infrastructure.

---

## Status Legend

- ~~Strikethrough~~ = Completed
- **Bold** = High priority next

---

## 1. Analytics & Reporting

- ~~Order Profit Analytics (monthly trend, seller breakdown, platform distribution, stat cards)~~ ✅
- **Spend Trend Charts** — Monthly/weekly line charts for card-level and overall spend over time
- **Transaction Categories** — Add `category` field to transactions (Groceries, Electronics, Travel, etc.) with donut chart in analytics
- **Cashback Utilization Report** — Show cashback earned vs. cashback limit per card per period (data exists in Card schema, not surfaced)
- **Year-over-Year Comparison** — Compare spending for same month/quarter across financial years
- **Seller Performance Dashboard** — Delivery time averages, cancellation rates, profit margins per seller

---

## 2. Data Export & Import

- ~~Orders CSV Export (client-side, filtered view, seller ledger view)~~ ✅
- **CSV Export — Remaining Entities** — Cards, transactions, seller master list, seller payments as downloadable CSV. Add `/api/export/:type` endpoint for server-side exports (current export is client-side only on filtered orders)
- **PDF Statements** — Generate monthly spending statements per card (mimic bank statements)
- **Ledger PDF Export** — Download a seller's complete Khata Book as PDF for sharing/records
- **JSON Full Backup** — One-click full data export as JSON for personal backup
- **Bank Statement Import** — Parse and import transactions from common bank CSV formats (HDFC, ICICI, SBI, etc.)
- **Bulk Order Import** — CSV import for orders (critical for resellers onboarding existing data)
- **Scheduled Exports** — Auto-email monthly CSV/PDF reports to user (leverages Nodemailer)

---

## 3. Credit Card Enhancements

- **Credit Limit & Utilization** — Add `credit_limit` field to Card schema; show utilization percentage bar on each CardWidget (spend vs. limit). Very low effort, high visibility.
- **Reward Points Tracking** — Track reward points earned per card alongside cashback (many cards offer points, not cashback)
- **Card Expiry Tracking** — Add `expiry_month`/`expiry_year` fields with visual warning when card is expiring in <60 days
- **Annual Fee Tracking** — Add `fee_type` (LTF/Paid), `annual_fee`, `fee_waiver_spend` so users know if they've spent enough for fee waiver
- ~~Billing Cycle Dates (statement date, due date)~~ ✅ (fields exist but not used for reminders)
- **Billing Due Date Reminders** — Surface reminders X days before due date using existing `billing_date`/`due_date` fields (data already in DB, just needs notification UI)
- **Card Comparison View** — Side-by-side comparison of cashback rates, limits, fees to decide which card to use for a purchase

---

## 4. Order Tracking Improvements

- ~~Order Remarks (free-text notes per order)~~ ✅
- ~~First Column Freeze in Orders table~~ ✅
- ~~Custom Variants & E-Comm Sites~~ — Skipped (hardcoded lists work fine for current use case)
- **Tracking Number & URL** — Add `tracking_number` and `tracking_url` fields to Order schema for courier tracking links
- **Order Timeline/History** — Record status transitions (ordered, shipped, delivered, returned) with timestamps as embedded array
- **Order Tags/Labels** — Custom tags (gift, resale, personal) for flexible categorization
- **EMI Tracking** — Track EMI plans: amount, tenure, remaining months, card used
- **Bulk Order Actions** — Multi-select orders for bulk status update, bulk delete, bulk "mark cleared"
- **Duplicate Order Detection** — Warn when creating an order with same model+variant+seller+date as existing one
- **Order Clone / Repeat Order** — One-click duplicate of an existing order (common reseller workflow)
- **Return/Refund Pipeline** — Track pending refunds separately from cleared orders with expected date

---

## 5. Seller & Ledger Enhancements

- **Extended Contact Info** — Add `email`, `upi_id`, `bank_account`, `ifsc` to Seller schema for quick payment reference
- **Seller Rating & Notes** — Manual 1-5 star reliability rating + free-text notes per seller
- **Payment Mode Tracking** — Add `payment_mode` field to SellerPayment (UPI, Bank Transfer, Cash, Cheque) for reconciliation
- **Dispute/Issue Log** — Track disputes against sellers with status (open/resolved), linked to specific orders
- **Recurring Payment Reminders** — For sellers with regular payment schedules, set up repeating reminders
- **Ledger Sharing** — Share a read-only link to a seller's ledger (useful for showing seller their account status)

---

## 6. Notifications & Reminders

> **Zero notification infrastructure exists today.**

- **In-App Notification Center** — Bell icon in navbar with dropdown of alerts (billing reminders, payment dues, budget warnings)
- **Billing Due Date Alerts** — Auto-generate reminders using existing Card `billing_date`/`due_date` fields (7-day, 3-day, 1-day before)
- **Seller Payment Due Alerts** — Alert when seller balance due exceeds a threshold
- **Budget Threshold Alerts** — Notify at 80%/100% of monthly budget
- **Browser Push Notifications** — Web Push API for real-time alerts (PWA already supports this)
- **Email Digest** — Weekly/monthly spending summary email (Nodemailer infra already exists)

---

## 7. Budgeting & Financial Goals

> **Entirely new feature area. The app tracks spending but doesn't help control it.**

- **Monthly Budget Setting** — Set overall or per-card monthly budgets with progress bars and visual alerts
- **Budget Dashboard Widget** — Show budget vs. actual spend on the main dashboard
- **Spending Alerts** — Configurable thresholds ("Alert me when HDFC spend exceeds 50k this month")
- **Savings Goals** — Define targets (e.g., "Save 1L by March") and track progress
- **Cashback Optimizer** — Show how much more to spend on each card to maximize cashback before period resets

---

## 8. User Account & Security

- ~~Profile Management (name, email update)~~ ✅
- ~~Password Change (old/new/confirm with inline validation)~~ ✅
- ~~Forgot Password / Email Reset (Nodemailer, SHA-256 tokens, 1-hour expiry)~~ ✅
- ~~Account Deletion (7-day grace period, auto-purge background job)~~ ✅
- **Two-Factor Authentication (2FA)** — TOTP-based using Google Authenticator/Authy
- **Session Management** — Show active sessions, logout all devices (JWT currently has no revocation)
- **Login Activity Log** — Show recent login history with IP/device info

---

## 9. Search & Filters

- ~~Global Search (cards, sellers, orders — keyboard nav, inline + modal modes)~~ ✅
- ~~Date Filter fixes + DateRangeDropdown~~ ✅
- **Transaction Search in Global Search** — Currently searches cards/sellers/orders but not individual transactions
- **Saved Filter Presets** — Save frequently used filter combos (e.g., "This month's Amazon orders on HDFC")
- **Amount Range Filters** — Filter transactions/orders by min-max amount
- **Fuzzy Search** — Typo-tolerant search for sellers/models (e.g., "samsng" → Samsung)

---

## 10. UI/UX Improvements

- ~~Dark/Light Theme Toggle~~ ✅
- ~~PWA Support (installable, service worker, offline caching)~~ ✅
- ~~Skeleton/Shimmer Loading States~~ ✅
- ~~Mobile Responsive Layout~~ ✅
- ~~Consistent Modal Pattern (modal-backdrop + modal-content + header/body/footer)~~ ✅
- ~~Styled File Upload with Preview (payment receipts)~~ ✅
- ~~Inline Receipt Preview in Ledger~~ ✅
- **Onboarding Tour** — First-time user walkthrough using `react-joyride`
- **Drag-and-Drop Card Reordering** — Let users reorder cards/banks on dashboard
- **Animated Page Transitions** — Smooth route transitions (tried CSS-only, didn't feel right — consider `framer-motion` or skip)
- **Empty State Illustrations** — Custom SVG illustrations for empty pages instead of icons

---

## 11. Multi-User & Sharing

- **Family/Team Shared Cards** — Multiple users tracking spend on same card (supplementary cards)
- **Shared Seller Profiles** — Shared seller with individual ledgers per user
- **Role-Based Access** — Admin vs. Viewer roles for shared workspaces
- **Invite System** — Invite users via email to join a shared workspace

---

## 12. Reseller Business Intelligence

> **New section — features tailored to the reseller business model this app actually serves.**

- **Product Performance Report** — Which model/variant combinations generate the most profit; identify losers to avoid
- **Cashback Cycle Countdown** — Show days remaining in each card's cashback billing cycle + "₹X more to hit cap" hint
- **Smart Card Recommendation** — Given an intended order amount, suggest the card that maximizes cashback (considering caps already used)
- **Price Drop Tracking** — Record order_amount history per model+variant to spot price trends over time
- **Platform Profit Leaderboard** — Rank e-comm sites by avg profit margin and return rate
- **Seller Concentration Risk** — Warn when >X% of pending cash flow is tied to a single seller
- **Cash Flow Forecast** — Project 7/30-day receivables based on seller balances and order delivery status
- **GST / Tax-Ready Report** — Aggregate yearly profit breakdown formatted for tax filing
- **Break-Even Calculator** — For a new card's annual fee, show minimum cashback needed and current progress
- **Pending Clearance View** — Orders with `delivery_status=delivered` but `is_cleared=false` represent money-in-flight to sellers; surface as a dedicated view with aging buckets (0-7, 7-15, 15+ days)

---

## 13. Productivity & Quick Entry

- **Quick-Add Shortcuts** — Floating action button: one-tap "Copy yesterday's order" / "Add cashback transaction"
- **Order Templates** — Save common order patterns (same model+seller+card) for one-click creation
- **Voice Input for Orders** — Web Speech API to dictate order details on mobile
- **OCR Receipt Scanning** — Upload a screenshot/receipt image, auto-extract amount/date/merchant (Tesseract.js or Cloudinary AI)
- **Paste-to-Parse** — Paste order confirmation text from Amazon/Flipkart email and auto-fill fields
- **Keyboard Shortcuts** — Power user shortcuts (N=new order, /=search, Esc=close, J/K=row nav)
- **Recently Used Sellers/Cards** — Surface top-5 recently used as quick chips in Add Order form

---

## 14. Technical & Infrastructure

- ~~Server-Side Pagination (MongoDB $unionWith + $facet)~~ ✅
- ~~Redis Caching (ioredis, 5-min TTL, graceful degradation)~~ ✅
- ~~Winston Logging (file + console transports)~~ ✅
- ~~Health Check Endpoint (/api/health)~~ ✅
- ~~Docker + Docker Compose~~ ✅
- ~~Unit & Integration Tests — Jest + Supertest (server, 42 tests), Vitest + React Testing Library (client, 31 tests)~~ ✅
- ~~API Documentation — Swagger/OpenAPI at `/api/docs` using swagger-jsdoc + swagger-ui-express~~ ✅
- ~~CI/CD Pipeline — GitHub Actions: server tests, client tests, client build with artifact upload~~ ✅
- ~~Input Validation Library — `express-validator` with per-route validator modules and a shared `validate` middleware that returns 400 + first error message~~ ✅
- **Rate Limiting Improvements** — Per-user rate limits (currently global), configurable windows
- ~~Database Indexes Audit — Compound indexes on Order (user_id+delivery_status+seller_id, card_id+order_date), ActivityLog (user_id+entity_id), User (deletion_requested_at sparse)~~ ✅
- **Error Tracking** — Integrate Sentry for production error monitoring

---

## Priority Matrix

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| **P0** | Credit Limit + Utilization on CardWidget | High | Very Low |
| **P0** | Smart Card Recommendation (cashback-aware) | Very High | Medium |
| **P0** | Pending Clearance View with aging buckets | Very High | Very Low |
| **P0** | Transaction Categories + Chart | High | Low |
| **P1** | Billing Due Date Reminders + Notification Center | High | Medium |
| **P1** | CSV Export — Remaining Entities + server endpoint | High | Medium |
| **P1** | Seller Contact Details (UPI, bank) + Payment Mode | Medium | Very Low |
| **P1** | Cash Flow Forecast (7/30-day receivables) | High | Medium |
| **P1** | Product Performance Report | High | Low |
| **P1** | Duplicate Order Detection + Order Clone | Medium | Low |
| **P2** | PDF Statements / Ledger Export | High | Medium |
| **P2** | Monthly Budget Tracking | High | High |
| **P2** | Bank Statement Import + Bulk Order Import | High | High |
| **P2** | OCR / Paste-to-Parse Order Entry | High | High |
| **P2** | Order Timeline / Status History | Medium | Medium |
| **P2** | 2FA (TOTP) + Session Management | Medium | Medium |
| **P2** | Saved Filter Presets + Amount Range Filters | Medium | Low |
| **P3** | GST / Tax-Ready Report | Medium | Medium |
| **P3** | Multi-User / Sharing | Medium | Very High |
| **P3** | Onboarding Tour + Keyboard Shortcuts | Low | Low |

---

## Recommended Build Order

1. **Pending Clearance View** — Pure frontend filter on existing data (delivered + uncleared), grouped into aging buckets. Shows exactly how much money is parked with each seller awaiting settlement.
2. **Credit Limit + Utilization** — Trivial schema addition, big UX win on CardWidget.
3. **Product Performance Report** — Reuses existing analytics infra; surfaces which models/variants actually make money.
4. **Smart Card Recommendation** — Unique differentiator for this app; uses data already in DB (cashback caps + current period spend).
5. **Seller Contact Details + Payment Mode** — Quick schema expansions with reconciliation payoff.
6. **CSV Export (remaining entities + server endpoint)** — Extend the orders-only client-side export to a proper `/api/export/:type` route.
7. **Cash Flow Forecast** — Build on seller ledger + order delivery data; high signal for business decisions.
8. **Notification Center + Billing Reminders** — Leverages existing `billing_date`/`due_date` fields + Nodemailer.
9. **Duplicate Detection + Order Clone** — Small quality-of-life wins that compound daily.
10. **PDF Export (statements + ledgers)** — Builds on CSV export infra once stable.
