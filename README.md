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
- Runs the comprehensive test suite (113/113 passing tests) across auth, orders, payments (eSewa/Fonepay), inventory reservation, and customer features.

---

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
