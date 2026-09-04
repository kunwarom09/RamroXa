# RamroXa E-Commerce Platform

A production-ready, full-stack E-Commerce platform built with **Next.js 14**, **Node.js/Express**, and **MongoDB**.

---

## 🚀 Quick Start for Collaborators

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/kunwarom09/RamroXa.git
cd RamroXa

# Install Server dependencies
cd server
npm install

# Install Client dependencies
cd ../client
npm install
```

---

## 🗄️ Database Setup (Zero-Config)

You do **not** need to install or configure a separate MongoDB instance manually. 
- When you run `npm run dev` in the `server` directory, the backend will **automatically start and connect to a persistent local MongoDB instance** on port `27017` with disk storage in `server/data/db`.
- On first launch, it will **auto-seed** all default categories, warehouses, products (including dedicated UK-size footwear variants), stock inventory, and the Super Admin account.

### Useful Database Commands (in `server/` directory):
```bash
# Re-seed missing products and categories
npm run db:seed

# Reset the entire database and restore clean initial state
npm run db:reset

# Create or restore Super Admin user
npm run db:create-admin
```

---

## 🏃 Running the Application

### Terminal 1: Backend API Server
```bash
cd server
npm run dev
```
- **API URL**: [http://localhost:5000](http://localhost:5000)
- **API Docs (Swagger UI)**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

### Terminal 2: Frontend Storefront & Admin Portal
```bash
cd client
npm run dev
```
- **Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 Default Credentials

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@zylo.com.np` | `AdminPassword123!` | Full Admin Panel & Storefront |

---

## 🧪 Running Integration Tests

```bash
cd server
npm test
```
- Runs the comprehensive test suite (117/117 passing tests) across auth, email verification, orders, payments (eSewa/Fonepay), inventory reservation, and customer features.

---

## 📧 Email Verification System & Diagnostics

The RamroXa email verification system is architected for seamless collaboration and production readiness:

### 1. Zero-Friction Development Mode (Default)
- When starting fresh with default `.env` placeholders, the server operates in **Development Preview Mode**.
- Verification emails generate a clickable verification link displayed directly in the backend terminal with box formatting:
  ```text
  ┌────────────────────────────────────────────────────────────────────┐
  │  📧 [DEV PREVIEW] EMAIL VERIFICATION LINK GENERATED                 │
  │  Recipient: customer@example.com                                   │
  │  Clickable URL:                                                    │
  │  http://localhost:3000/verify-email?token=...                      │
  └────────────────────────────────────────────────────────────────────┘
  ```
- Click the URL or paste it into your browser to verify the account instantly.

### 2. Live SMTP Setup (Gmail / Custom SMTP)
To deliver real emails to actual user inboxes:
1. In `server/.env`, set:
   ```env
   SMTP_SERVICE=gmail
   SMTP_USER=your_real_email@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```
   > **Note on Gmail:** Requires 2-Step Verification enabled on your Google Account. Generate an App Password at [Google Account App Passwords](https://myaccount.google.com/apppasswords). Normal Google account passwords will be rejected by Google's SMTP servers.

### 3. Safe Email Diagnostic Tool
Run the diagnostic suite anytime to verify SMTP connectivity without exposing secrets:
```bash
cd server

# Verify SMTP socket and credentials only
npm run email:test -- --verify-only

# Or send a live test message to your email
npm run email:test -- --to=your_email@gmail.com
```

## 📂 Project Architecture

```
RamroXa/
├── client/                     # Next.js 14 App Router Frontend
│   ├── app/                    # Pages (Shop, Checkout, Auth, Admin, Verify Email)
│   ├── components/             # React Storefront & UI components
│   └── services/               # Frontend API Client & State Management
├── server/                     # Express REST API Backend
│   ├── src/
│   │   ├── config/             # DB & Environment Configuration
│   │   ├── controllers/        # Route Controllers
│   │   ├── middleware/         # Auth, Role Gate, Rate Limit, Error Handlers
│   │   ├── models/             # Mongoose Models & Schemas
│   │   ├── routes/             # API Route Definitions
│   │   ├── scripts/            # Seed, Reset & Admin Generators
│   │   └── services/           # Business Logic (Auth, Email, Order, Inventory)
│   └── tests/                  # Automated Integration Test Suites (Vitest)
└── README.md
```
