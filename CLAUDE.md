# CardVault - Credit Card Spend Tracker & Financial Analyser

Full-stack financial management app for tracking credit card spend, orders, seller relationships, and profit analytics. Built for resellers/business owners managing multiple credit cards.

## Tech Stack

- **Backend**: Node.js, Express v5, MongoDB (Mongoose v8), Redis (ioredis), JWT auth
- **Frontend**: React 18, Vite, React Router v7, Axios, Recharts, Context API
- **Infra**: Docker + Docker Compose, PWA (vite-plugin-pwa), Cloudinary (file uploads), Nodemailer (emails), Winston (logging)

## Project Structure

```
server/
  index.js              # Express app entry, route registration, cleanup scheduler
  config/db.js          # MongoDB connection
  middleware/auth.js     # JWT verification middleware
  models/               # Mongoose schemas: User, Card, Transaction, Order, Seller, SellerPayment, PasswordResetToken
  routes/               # REST endpoints: auth, cards, transactions, orders, sellers, summary, analytics
  utils/
    cache.js            # Redis caching (graceful degradation if unavailable)
    helpers.js          # pickFields utility (mass-assignment protection)
    logger.js           # Winston file + console logging
    mailer.js           # Nodemailer (Ethereal in dev, SMTP in prod)
    cloudinary.js       # Cloudinary upload for payment receipts
    accountCleanup.js   # Background job: purge deleted accounts after 7-day grace period

client/
  src/
    api.js              # Axios instance + all API method exports
    App.jsx             # Route definitions
    context/            # AuthContext (user/token), ThemeContext (dark/light)
    hooks/useSummary.js # Summary data fetching + date filtering
    pages/              # AuthPage, DashboardPage, OrdersPage, SellersPage, SellerLedgerPage,
                        # ProfilePage, ChangePasswordPage, OrderAnalyticsPage, ForgotPasswordPage, ResetPasswordPage
    components/         # Navbar, CardWidget, AddCardModal, AddTransactionModal, AddOrderModal,
                        # AddPaymentModal, AddSellerModal, SellerLedgerModal, TransactionsTableView
    common/             # ActionMenu, ConfirmModal, DateFilter, DateRangeDropdown, ErrorBoundary,
                        # GlobalSearch, Pagination, SearchableDropdown, SingleDatePicker
    styles/             # CSS modules: base, layout, layout-mobile, auth, component-specific
    constants/index.js  # Shared constants (variants, ecomm sites, delivery statuses)
    utils/formatters.js # Currency/date formatting helpers
```

## Commands

```bash
# Development
cd server && npm install && npm run dev    # Backend on :5000 (nodemon)
cd client && npm install && npm run dev    # Frontend on :3000 (Vite, proxies /api to :5000)

# Production
cd server && npm start
cd client && npm run build                 # Outputs to client/dist/

# Docker (full stack)
docker-compose up --build                  # Server :5000, Client :80, MongoDB :27018
```

## Environment Variables

**Server** (`server/.env`):
- `PORT` (5000), `MONGO_URI`, `JWT_SECRET`
- `REDIS_URL` (optional, defaults to localhost:6379)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` (email)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CORS_ORIGINS`, `CLIENT_URL`, `LOG_LEVEL`

**Client** (`client/.env`):
- `VITE_API_URL` (e.g., `http://localhost:5000/api`)

## Database Models

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **User** | name, email, password (bcrypt), deletion_requested_at | comparePassword method, 7-day deletion grace |
| **Card** | user_id, bank_name, card_network, last_four_digit, cashback config, billing/due dates | Index: {user_id, bank_name} |
| **Transaction** | card_id, amount, description, date | Index: {card_id, date} |
| **Order** | user_id, card_id, seller_id, order/return amounts, cashback, variant, model, delivery_status, ecomm_site | Profit = return_amount - order_amount + cashback |
| **Seller** | user_id, name, city, phone | Stats computed dynamically via aggregation |
| **SellerPayment** | user_id, seller_id, amount, payment_date, notes, receipt_url (Cloudinary) | Index: {user_id, seller_id, payment_date} |
| **PasswordResetToken** | user_id, token (SHA-256 hash), expires_at, used | TTL index auto-deletes expired tokens |

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` - Register (password: 8+ chars, upper+lower+digit+special)
- `POST /login` - Login, returns JWT (30-day expiry)
- `PUT /profile` - Update name/email (auth required)
- `PUT /change-password` - Change password with old password verification
- `POST /request-deletion` / `POST /cancel-deletion` / `GET /account-status` - Account deletion flow
- `POST /forgot-password` / `POST /reset-password/:token` - Email-based password reset

### Cards (`/api/cards`)
- `GET /` / `POST /` / `PUT /:id` / `DELETE /:id` - CRUD (delete cascades to transactions)

### Transactions (`/api/transactions`)
- `GET /` - Merged view of transactions + orders via `$unionWith` aggregation. Query: cardId, bankName, from_date, to_date, page, limit
- `POST /` / `DELETE /:id`

### Orders (`/api/orders`)
- `GET /` / `POST /` / `PUT /:id` / `DELETE /:id` - Filters: date ranges, seller, card, delivery_status, model, ecomm_site

### Sellers (`/api/sellers`)
- `GET /` / `GET /:id` / `POST /` / `PUT /:id` / `DELETE /:id` - Delete blocked if orders exist
- `GET /:sellerId/payment` / `POST /payment` / `PUT /payment/:id` / `DELETE /payment/:id` - Payment ledger (multipart upload for receipts)

### Summary (`/api/summary`)
- `GET /` - Spend per card/bank with date filtering (5-min Redis cache)

### Analytics (`/api/analytics`)
- `GET /profit` - Monthly profit trend, profit by seller (%), profit by e-comm site (5-min Redis cache)

### Health (`/api/health`)
- `GET /` - MongoDB/Redis status, uptime, memory

## Architecture Notes

**Auth flow**: JWT stored in localStorage as `cv_token` -> Axios interceptor attaches `Authorization: Bearer` header -> `authMiddleware` validates -> 401 triggers auto-logout.

**Caching**: Redis with 5-min TTL on summary/analytics. Graceful degradation (no-op if Redis unavailable). Cache invalidated on POST/PUT/DELETE to cards/transactions/orders/sellers using wildcard pattern `route:{userId}:*`.

**Transactions merge**: GET /api/transactions uses MongoDB `$unionWith` to combine transactions + orders into a unified timeline, with `$facet` for parallel count + total + paginated results in a single query.

**Seller stats**: Computed dynamically on every GET via Order + SellerPayment aggregation (not stored in DB), ensuring consistency.

**Account deletion**: Request sets `deletion_requested_at` -> 7-day grace (login cancels) -> background job runs every 6 hours to cascade-delete all user data.

**Security**: bcrypt (12 rounds), rate limiting (20 req/15min on auth), field whitelisting via `pickFields`, ownership verification on all endpoints, password complexity validation.

**PWA**: Service worker with NetworkFirst for API (5-min cache), CacheFirst for fonts (1-year cache). Installable on mobile/desktop.

## No Test Suite

Tests do not exist yet. Suggested: Jest + Supertest (server), React Testing Library (client).
