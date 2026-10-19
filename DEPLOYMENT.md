# ClientFlow CRM - Production Deployment Guide (Vercel & Render)

This comprehensive guide details step-by-step instructions for deploying **ClientFlow CRM** using **Vercel** (for the React/Vite Frontend), **Render** (for the Express/Node.js API), and **MongoDB Atlas** (for the cloud database).

---

## 🏛️ System Architecture

```mermaid
flowchart LR
    User["User Browser"]
    subgraph Vercel ["Vercel (Global Edge Network)"]
        Frontend["Vite + React SPA\n(clientflow.vercel.app)"]
        Rewrite["Vercel Rewrite Proxy\n(/api/* -> Render)"]
    end
    subgraph Render ["Render (Web Service)"]
        API["Express API Server\n(Node.js + TypeScript)"]
        Auth["Session Store\n(connect-mongo)"]
    end
    subgraph Atlas ["MongoDB Atlas (Cloud DB)"]
        DB[(MongoDB Cluster\nUsers, Deals, Tasks, etc.)]
    end

    User -->|Visits App & API| Frontend
    Frontend --> Rewrite
    Rewrite -->|Secure HTTPS Proxy| API
    API --> Auth
    API --> DB
```

---

## 📋 Prerequisites Checklist

Before you begin, ensure you have:
1. A **GitHub account** with this repository pushed to your remote.
2. A free **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)** account.
3. A free **[Render](https://render.com/)** account.
4. A free **[Vercel](https://vercel.com/)** account.

---

## 🍃 Step 1: Set Up MongoDB Atlas (Database)

Render's Web Services are stateless, so a persistent cloud MongoDB instance is required.

1. **Sign in to MongoDB Atlas** and create a new project (e.g. `ClientFlow-CRM`).
2. **Deploy a Free Cluster**:
   - Choose the **M0 (Free)** tier.
   - Provider: AWS / GCP / Azure (select the region closest to your Render service).
   - Click **Create Deployment**.
3. **Configure Database Access (User)**:
   - Go to **Security > Database Access** > click **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: e.g. `clientflow_user`.
   - Password: Click **Autogenerate Secure Password** and copy it safely.
   - Database User Privileges: `Read and write to any database`.
   - Click **Add User**.
4. **Configure Network Access (IP Whitelist)**:
   - Go to **Security > Network Access** > click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Note: Render's free tier uses dynamic IP addresses, so `0.0.0.0/0` is necessary.*
   - Click **Confirm**.
5. **Obtain Connection String**:
   - Return to **Deployments > Database**.
   - Click **Connect** on your cluster > choose **Drivers** (Node.js).
   - Copy your connection string. It will look like:
     ```
     mongodb+srv://clientflow_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```
   - Replace `<password>` with your database user password and append the database name `/clientflow`:
     ```
     mongodb+srv://clientflow_user:YOUR_PASSWORD@cluster0.abcde.mongodb.net/clientflow?retryWrites=true&w=majority
     ```

---

## 🚀 Step 2: Deploy Backend to Render

Render will host the Node.js Express server. You can choose **Method A (Render Dashboard)** or **Method B (Render Blueprint)**.

### Method A: Manual Setup via Render Dashboard

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation bar and select **Web Service**.
3. Connect your GitHub repository containing ClientFlow CRM.
4. Configure the service parameters:
   - **Name**: `clientflow-crm-api` *(or your custom name)*
   - **Region**: Choose a region close to your MongoDB cluster (e.g., *Oregon (US West)* or *Frankfurt (EU)*).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
5. Click **Advanced** and set:
   - **Health Check Path**: `/api/health`
6. Add the following **Environment Variables**:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations & secure cookies |
| `MONGODB_URI` | `mongodb+srv://clientflow_user:.../clientflow` | Your MongoDB Atlas connection URI |
| `SESSION_SECRET` | *(Generate a 32+ character random string)* | E.g. run `openssl rand -hex 32` in your terminal |
| `CLIENT_URL` | `https://your-crm.vercel.app` *(or `*` temporarily)* | Your Vercel frontend domain |
| `ADMIN_EMAIL` | `admin@clientflow.com` | Default admin email (auto-seeded on first boot) |
| `ADMIN_PASSWORD` | `AdminPassword123!` *(or a strong secret)* | Default admin login password |
| `COOKIE_SAME_SITE` | `lax` *(for Vercel rewrites)* or `none` *(for cross-domain)* | Cookie SameSite policy |

7. Click **Create Web Service**. Render will clone, build, and deploy your API.
8. Once deployment displays **"Live"**, copy your backend URL (e.g., `https://clientflow-crm-api.onrender.com`).
9. **Verify Health**: In your browser, open `https://<YOUR-RENDER-URL>/api/health`. You should receive:
   ```json
   {"status":"ok","timestamp":"2026-..."}
   ```

### Method B: Deploy using Render Blueprint (`render.yaml`)

This repository includes a `render.yaml` blueprint:
1. In the Render Dashboard, click **New +** > **Blueprint**.
2. Connect your repository.
3. Render reads `render.yaml` and will prompt you to enter `MONGODB_URI`, `CLIENT_URL`, and `ADMIN_PASSWORD`.
4. Click **Apply**.

### 📦 Optional: Seed Demo Data on Render
Upon first launch, the server automatically creates the Administrator account if the database is empty. If you also want to seed sample customers, pipeline deals, tasks, and activity logs:
1. In the Render Dashboard, navigate to your web service.
2. Click the **Shell** tab on the left menu.
3. Run:
   ```bash
   npm run seed:prod
   ```
4. All sample records and pipeline cards will be populated in your MongoDB Atlas cluster!

---

## ⚡ Step 3: Deploy Frontend to Vercel

Vercel will host the React Vite Single Page Application.

### Option 1: Vercel Reverse Proxy Rewrites (Recommended)
This approach routes `/api/*` through Vercel's edge proxy directly to Render. 
- **Advantage**: Prevents third-party cookie blocking in modern browsers (Chrome/Safari), eliminates CORS issues, and keeps cookies first-party (`SameSite=Lax`).

1. Open `client/vercel.json` in your local repository and configure the rewrite destination:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://YOUR-RENDER-BACKEND.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
   *(Replace `YOUR-RENDER-BACKEND.onrender.com` with your actual Render URL, then commit and push to GitHub).*

2. Log into [vercel.com](https://vercel.com) and click **Add New... > Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Project Name**: `clientflow-crm`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `client`.
   - **Build and Output Settings**:
     - Build Command: `npm run build` (or leave default)
     - Output Directory: `dist` (default)
     - Install Command: `npm install` (default)
5. Click **Deploy**.

---

### Option 2: Direct Cross-Origin with Environment Variable
If you prefer not to edit `vercel.json` with a hardcoded URL:

1. Ensure `client/vercel.json` contains the SPA routing rule:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
2. Import the project in Vercel with **Root Directory** set to `client`.
3. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://YOUR-RENDER-BACKEND.onrender.com`
4. Click **Deploy**.
5. In Render's Dashboard, ensure:
   - `CLIENT_URL` = `https://YOUR-VERCEL-APP.vercel.app`
   - `COOKIE_SAME_SITE` = `none`

---

## ✅ Step 4: Verification & Smoke Test

Once both services are deployed:

1. **Open your Vercel URL** (e.g. `https://clientflow-crm.vercel.app`).
2. **Log In**:
   - Email: `admin@clientflow.com` (or your configured `ADMIN_EMAIL`)
   - Password: `AdminPassword123!` (or your configured `ADMIN_PASSWORD`)
3. **Verify Features**:
   - **Kanban Board**: Navigate to **Pipeline** (`/pipeline`) and drag a deal card between stages.
   - **Customer Directory**: Go to **Customers** (`/customers`) and create a customer.
   - **Export Data**: Click **Export > Download Excel (.xlsx)** or **CSV** to verify binary/blob downloads.
   - **SPA Route Reload**: Refresh while on `/reports` or `/tasks` to ensure no 404 errors occur.

---

## 🛠️ Production Tips & Troubleshooting

### 1. Render Free Tier Spin-Down (Cold Starts)
- **Behavior**: On Render's Free tier, Web Services spin down after 15 minutes of inactivity. When a new request arrives, it may take 40–50 seconds to boot up.
- **Solution**:
  - Set up a free uptime monitor (e.g., [UptimeRobot](https://uptimerobot.com) or [Cron-job.org](https://cron-job.org)) that sends an HTTP GET request to `https://<YOUR-RENDER-URL>/api/health` every 10–14 minutes.
  - Or upgrade to Render's **Starter** tier ($7/month) for persistent 24/7 uptime.

### 2. Login Fails or User Immediately Logged Out
- **Cause 1**: Proxy trust not enabled. (Already resolved in `server/src/index.ts` via `app.set('trust proxy', 1)`).
- **Cause 2**: Cross-origin cookies blocked. If you deployed without Vercel rewrites, make sure `COOKIE_SAME_SITE=none` on Render, and your browser is not blocking third-party cookies. Using **Option 1 (Vercel Rewrites)** resolves this completely.

### 3. Page Refresh Returns 404 on Vercel
- **Cause**: Vercel is looking for a physical static file at `/customers` or `/pipeline`.
- **Solution**: The `client/vercel.json` file includes a rewrite rule mapping `/(.*)` to `/index.html`. Ensure `client/vercel.json` is committed to Git.

### 4. Database Connection Timeout
- **Cause**: MongoDB Atlas Network Access whitelist does not allow incoming requests from Render.
- **Solution**: Verify that `0.0.0.0/0` is added under **Security > Network Access** in MongoDB Atlas.
