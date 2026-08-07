# 🌌 OMEN WRAITH - Production Ready Gaming Store

Welcome to **OMEN WRAITH**, the premium, dark-themed, ultra-high-performance Arabic gaming accessories storefront. Designed specifically for professional esports enthusiasts and gamers in the Kingdom of Saudi Arabia, the application provides an immersive, high-end shopping experience featuring glassmorphism visuals, smooth motion micro-animations, comprehensive RTL layouts, and a secure server-side checkout system.

---

## 📂 Project Architecture & Directory Map

```text
├── .env.example             # Documented production environment variables template
├── index.html               # Main entry point with pre-rendered SEO & Open Graph headers
├── package.json             # NPM dependencies & build automation pipeline
├── server.ts                # Production-grade Express + Vite custom server with security layers
├── tsconfig.json            # Strict TypeScript configuration engine
├── vite.config.ts           # Production build bundling engine
├── src/
│   ├── App.tsx              # Application layout root with React Lazy dynamic loading hooks
│   ├── data.ts              # High-performance static catalog and logistics data structures
│   ├── index.css            # Global CSS styling leveraging Tailwind directives and Cairo fonts
│   ├── main.tsx             # SPA hydration entry point
│   ├── supabaseClient.ts    # Secure client-side credentials initializer
│   ├── types.ts             # Standardized global TypeScript models (Category, Product, Order)
│   ├── zod-schemas.ts       # Secure bidirectional data validation schema models (Zod)
│   ├── components/
│   │   ├── AdminDashboard.tsx      # Admin panel with live stock and status trackers
│   │   ├── CartDrawer.tsx          # Real-time Checkout & cart drawer using safe REST API calls
│   │   ├── Header.tsx              # Dynamic navigation and admin launcher header
│   │   ├── ProductCard.tsx         # Performance-optimized card with lazy loaded images & custom IDs
│   │   ├── ProductDetailsModal.tsx # Interactive modal displaying high-fidelity specs
│   │   └── Toast.tsx               # Beautiful notification system
│   └── services/
│       ├── supabaseService.ts      # Fetching pipelines & admin state mutation controls
│       └── telegramService.ts      # Failover messaging clients (client fallback)
└── supabase/
    ├── schema.sql           # Database schema containing automated update triggers
    ├── policies.sql         # Production-grade Row Level Security (RLS) policies
    └── seed.sql             # Real-world luxury product initial catalog seed
```

---

## 🛠️ Complete Installation Guide

Follow these steps to download, install, configure, and launch the OMEN WRAITH project locally:

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js**: `v18.0.0` or higher (LTS recommended)
* **npm**: `v9.0.0` or higher
* **Git** (optional, for repository management)

### 2. Clone and Setup Dependencies
Navigate to your working directory and install the required modules:
```bash
# Install core package dependencies
npm install
```

### 3. Environment Configuration
Copy the sample environment configuration file and supply your service credentials:
```bash
cp .env.example .env
```
Open `.env` and fill in your custom credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_BOT_TOKEN=your-telegram-bot-token
VITE_CHAT_ID=-100xxxxxxxxxx
```

### 4. Running the Development Server
Execute the dev environment script to launch the full-stack server (Vite middleware inside Express):
```bash
npm run dev
```
Open your browser to `http://localhost:3000` to preview the store in development mode.

---

## 📦 Database Migration & Seed Instructions (Supabase)

Initialize your high-performance PostgreSQL database backend in Supabase with strict constraints:

### 1. Schema Migration
1. Go to your [Supabase Dashboard](https://supabase.com/).
2. Select your project and navigate to the **SQL Editor** tab from the left sidebar.
3. Click **New Query**.
4. Open the file `/supabase/schema.sql` from your local workspace, copy its entire contents, paste them into the SQL Editor, and click **Run**.
5. *This establishes all categories, products, multi-angle images, orders, order items, settings tables, indexes, and automatic timestamp modification triggers.*

### 2. Row Level Security (RLS) Policies
1. Open a new query in the **SQL Editor**.
2. Copy the contents of `/supabase/policies.sql`, paste them into the editor, and click **Run**.
3. *This locks down all tables, enabling strict admin-only read/write access for orders and settings, while allowing guests to securely insert orders and view catalog details.*

### 3. Catalog Seed Data
1. Open a final query in the **SQL Editor**.
2. Copy the contents of `/supabase/seed.sql`, paste them into the editor, and click **Run**.
3. *This populates your store with real-world, highly detailed luxury gaming products (e.g., Magnesium gaming mice, Hall Effect mechanical keyboards, high-performance deskpads).*

---

## ⚙️ Telegram Notification Bot Setup

The store notifies your logistics or fulfillment team immediately when a new checkout is successfully processed:

1. **Create a Bot**:
   * Open Telegram and search for `@BotFather`.
   * Start a chat, send the `/newbot` command, and follow the simple steps to name your bot.
   * Copy the generated **HTTP API Token** (e.g., `721029342:AAHGf0R...`) and paste it as `VITE_BOT_TOKEN` in your environment.

2. **Get Chat ID**:
   * Create a new Telegram group or chat.
   * Add your new bot as a member of the group.
   * Send a placeholder message to the group (e.g., "Hello Omen Wraith").
   * Open your web browser and navigate to: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   * Find the `"chat":{"id": -xxxxxxxxxx}` parameter inside the JSON response.
   * Copy the negative number (including the minus sign) and paste it as `VITE_CHAT_ID` in your environment.

---

## 🚀 Production Deployment Guide

Deploy your secure, full-stack application to any popular host in minutes:

### Option A: Vercel Deployment Guide
Vercel supports serverless deployments. Because we use a custom full-stack Express server, we leverage Vercel Serverless Functions:

1. **Create `vercel.json`** in the project root:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/server.cjs",
         "use": "@vercel/node"
       },
       {
         "src": "dist/**/*",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "dist/server.cjs"
       },
       {
         "src": "/robots.txt",
         "dest": "dist/server.cjs"
       },
       {
         "src": "/sitemap.xml",
         "dest": "dist/server.cjs"
       },
       {
         "src": "/(.*)",
         "dest": "dist/index.html"
       }
     ]
   }
   ```
2. **Build the Application Locally**:
   Ensure your build script compiles the assets correctly:
   ```bash
   npm run build
   ```
3. **Deploy via Vercel CLI**:
   Install Vercel globally and deploy with your environment variables:
   ```bash
   npm install -g vercel
   # Connect to your account and trigger deployment
   vercel --prod
   ```

### Option B: Cloud Run / Container Deployment Guide
Your application contains a custom server that listens to port `3000` on `0.0.0.0` by default. This makes it 100% compatible with Google Cloud Run, AWS ECS, or any standard container:

1. **Dockerized Environment**:
   Create a standard `Dockerfile` in the root:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   ENV NODE_ENV=production
   EXPOSE 3000
   CMD ["npm", "start"]
   ```
2. **Build and Deploy**:
   ```bash
   gcloud run deploy omen-wraith-store --source . --port 3000 --allow-unauthenticated
   ```

---

## 🔒 Advanced Optimization, Security & Accessibility Review

### 1. Performance & Optimization
* **Lazy Loading**: Major visual panels (`CartDrawer`, `ProductDetailsModal`, `AdminDashboard`) are dynamic imports, compiled only when requested by the user, slashing initial payload sizes.
* **Image Delivery**: Product cards utilize standard `loading="lazy"` attributes and custom modern aspect ratios to keep core page speeds ultra-fast.
* **Code Splitting**: Client and Server modules are completely independent, built via standard ES Module splitting systems.

### 2. Full-Stack Security
* **SQL Injection & XSS Shield**: Handled natively by PostgreSQL prepared statements and our custom Express middleware sanitizing all outbound responses.
* **CSRF & Rate Limiting**: Our custom server validates request headers (`origin`, `referer`) to prevent cross-site request forgery, and implements a lightweight rate-limiting bucket restricting checkout submissions to a maximum of 5 attempts per 15 minutes per IP address.
* **Strict CORS & Content-Security-Policy**: Configured directly in the response headers of `server.ts` to ensure only trusted scripts can be parsed.

### 3. Comprehensive Accessibility (a11y)
* All core buttons and links feature unique programmatic `id` properties, `aria-label` tags, and responsive, high-contrast focus rings for keyboard-only or screen-reader browsing.
* RTL styling incorporates fully legible, high-contrast `Cairo` and `Orbitron` font sizes conforming strictly to Web Content Accessibility Guidelines (WCAG).

---

## 📋 Final Deployment Checklist

Before taking the application live, ensure that all the following tasks are complete:
- [x] Create a dedicated Supabase project.
- [x] Run `schema.sql` to establish database models and indexing.
- [x] Run `policies.sql` to activate Row Level Security (RLS).
- [x] Run `seed.sql` to import the initial high-fidelity Arabic catalog.
- [x] Create a Telegram Bot and add it to your operational channel/group.
- [x] Configure all environment variables inside `.env` or your hosting provider dashboard.
- [x] Run `npm run lint` and verify there are no syntax or type checking errors.
- [x] Run `npm run build` to confirm Vite compiles static assets and esbuild bundles the custom server seamlessly.
