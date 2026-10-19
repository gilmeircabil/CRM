# ClientFlow CRM (Functional Prototype)

ClientFlow CRM is a responsive web CRM tailored for small and medium businesses, freelancers, agencies, and sales/support teams. It provides end-to-end functionality for managing customer relationships, tracking sales pipelines via an interactive Kanban board, managing follow-up tasks with deadline alerts, logging notes/calls/meetings, analyzing conversion metrics, importing contacts via CSV, and exporting data to CSV and Excel (.xlsx).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query v5, Recharts, Lucide Icons, PapaParse.
- **Backend**: Node.js, Express, TypeScript, Zod validation, express-session, connect-mongo, bcrypt, ExcelJS, Helmet.
- **Database**: MongoDB via Mongoose. Seamless support for MongoDB Atlas, local `mongod`, or zero-config in-memory MongoDB fallback.
- **Security**: HttpOnly SameSite=Lax session cookies, bcrypt password hashing, NoSQL injection prevention sanitizers, regex escaping, server-enforced role authorizations.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

Default configuration in `.env`:
```env
PORT=5000
NODE_ENV=development
# Set to your MongoDB Atlas connection string or local mongod.
# If no external MongoDB is running, the server automatically starts an in-memory instance for seamless evaluation.
MONGODB_URI=mongodb://localhost:27017/clientflow
SESSION_SECRET=clientflow-prototype-session-secret-change-in-production-12345
ADMIN_EMAIL=admin@clientflow.com
ADMIN_PASSWORD=AdminPassword123!
```

### 3. Installation
Install all dependencies across root, server, and client:
```bash
npm run install:all
```
*(Or run `npm install` inside the root, `/server`, and `/client` directories)*

### 4. Seed Database
Seed initial admin user, sample staff, customers, deals across all 6 stages, tasks, and activity logs:
```bash
npm run seed
```

### 5. Start the Application
Run both backend Express server and Vite frontend concurrently:
```bash
npm run dev
```

- **Frontend URL**: [http://localhost:5173](http://localhost:5173)
- **Backend API URL**: [http://localhost:5000](http://localhost:5000) (Vite proxies `/api` to Express)

---

## ☁️ Cloud Deployment (Vercel & Render)

For step-by-step instructions on deploying the React frontend to **Vercel**, the Express API to **Render**, and the database to **MongoDB Atlas**, see the [Production Deployment Guide](DEPLOYMENT.md).

---

## 🔑 Demo Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@clientflow.com` | `AdminPassword123!` | Full access, user management, all reports & exports |
| **Staff Member** | `sarah.sales@clientflow.com` | `StaffPassword123!` | Manages own customers, deals, tasks, and activities |

*Tip: The login page includes one-click "Admin Login" and "Staff Login" buttons for instant evaluation.*

---

## ✨ Features Implemented

1. **Project Setup & Seed Script**:
   - Monorepo layout with `/client` and `/server`.
   - Automated seed script populating admin, staff, sample customers, deals, tasks, and activities.
   - Zero-config fallback to in-memory MongoDB when local mongod is not present.

2. **Authentication & Role-Based Access Control**:
   - Express session auth with `connect-mongo` store and HttpOnly cookies.
   - Server-enforced role authorization (`requireAuth`, `requireAdmin`, staff ownership scoping).
   - "Team & Roles" page where administrators can create, edit, activate, or deactivate staff accounts.

3. **Customer Management**:
   - Create, edit, and view customer profiles.
   - Soft-delete (archive) and restore customers.
   - Real-time search across name, email, and company, with status filtering (All, Active, Inactive, Archived).
   - Customer detail page displaying linked deals, follow-up tasks, and reverse-chronological activity timeline.

4. **Sales Pipeline & Deals**:
   - Interactive Kanban board across 6 stages: *New Lead*, *Contacted*, *Qualified*, *Proposal*, *Won*, and *Lost*.
   - Drag-and-drop deal stage progression persisting to the database.
   - Stage dropdown fallback inside deal detail/edit modals.
   - Transitioning to *Won* or *Lost* automatically sets `closedAt` and logs a `deal_update` activity.
   - Filterable Recent Deals table (All, Open, Won, Lost) with colored stage badges.

5. **Follow-up Tasks**:
   - Task creation with priority (*low*, *medium*, *high*), deadline, and assignee.
   - One-click task completion / reopening with real-time strike-through and automatic system activity logging.
   - Filter tabs: *Open*, *My Tasks*, *Due Today*, *Overdue*, *Completed*, and *All Tasks (Team)*.
   - Relational links to specific customers and deals.

6. **Notes & Activity History**:
   - Quick-logging interface for Notes, Calls, and Meetings.
   - Reverse-chronological timeline displaying manual entries alongside automatic system activities.

7. **Real-time Analytics Dashboard**:
   - 7 KPI cards: Total Customers, New Leads (30d), Active Deals, Won Deals, Total Revenue, Conversion Rate (%), and Overdue Tasks.
   - Monthly Revenue Bar Chart (Recharts) aggregating won deals over the last 12 months.
   - Compact Pipeline Summary showing count and total value per stage.
   - Recent Deals table. All metrics scoped by role (staff see own, admin sees all).

8. **Notifications**:
   - In-app notification bell with real-time unread badge.
   - Automatic generation of "Due Soon" (<= 24h) and "Overdue" task alerts without duplicates.
   - Polling every 60 seconds; mark individual or all as read.
   - Clicking an alert navigates directly to the task queue.

9. **Reports & Exports**:
   - Sales summary metrics: Won Deals, Won Value, Lost Deals, Total Closed, and Win Rate (%).
   - Charts: Monthly revenue closed, deals by stage, revenue by lead source, and rep performance (admin-only).
   - Date range filtering (`startDate`, `endDate`).
   - One-click export of Customers and Deals to both **CSV** and **Excel (.xlsx)**.

10. **CSV Import of Contacts**:
    - "Import Contacts" modal on the Customers page.
    - Client-side CSV preview using PapaParse.
    - Column mapping and validation (name, email, phone, company, jobTitle).
    - Server-side deduplication against database and batch rows.
    - Comprehensive result summary showing imported count, skipped count, and row-by-row error details.

11. **UI & Responsiveness**:
    - Modern card-based dashboard with indigo/blue accent.
    - Collapsible mobile navigation menu with backdrop overlay.
    - Top bar with global search (suggests matching customers, deals, and tasks) and notification bell.
    - Loading spinners, empty states, and error alerts across every data view.

---

## 🔒 Security Baseline

- Passwords hashed with `bcrypt` (10 salt rounds); excluded from JSON serialization.
- Zod validation for every request body, query parameter, and route param (including ObjectId format check).
- NoSQL injection prevention middleware blocking raw objects or keys containing `$` or `.`.
- Regex search inputs escaped against ReDoS and regex injection.
- Server-side authorization checks on every route (role admin vs staff ownership checks).
- `helmet` security headers enabled.
