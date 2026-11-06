# SamTube

Hindi + English YouTube video discovery app — search, embedded playback, likes, watch history aur playlists.
Koi login nahi, koi database nahi: tumhara data browser ke `localStorage` me rehta hai.

![status](https://img.shields.io/badge/status-ready-brightgreen)

## Features

- **Real YouTube search** — official Data API v3 (agar key hai) ya **key-free public mode** (bina key bhi chalta hai).
- **Hindi / English / All tabs** — ek tap me sirf Hindi videos (`हिंदी` tab), sirf English, ya dono mixed.
- **Quality filter** — AI-generated, template, logo, intro, status/ringtone spam hata diya jaata hai; educational aur purani videos upar.
- **Sort control** — `Educational + older` (default), `Oldest first`, `Newest first`.
- **Search suggestions** — type karte waqt live suggestions.
- **Categories** — Technology, Science, History, Space, AI, Gaming, Music, etc.
- **Special lanes** — ॐ Bhagwan (Mahabharat/Ramayan/Upanishad), 🎧 Audiobooks (human voice only, 2026 tak), 📈 Trading (sirf trading-SIKHNE wali videos — share market, analysis, options; 2026 tak).
- **Custom Sections (permanent)** — Login/Signup (email+password, httpOnly cookie session) → apna filter permanently database me save karo. 9 categories / 200+ topics + keywords, Strict / Balanced / Discovery / Custom modes, drag-and-drop reorder, pin/hide/favorite, duplicate, export/import JSON, independent feeds per section, "Why am I seeing this?" per video.
- **Watch page** — embedded player, related videos, captions preference, description.
- **Likes, watch history, playlists** — sab locally saved, instant.
- **Infinite scroll + caching** — server 10 min tak responses cache karta hai (quota friendly).
- **Responsive UI** — desktop sidebar, mobile drawer, skeleton loaders, toasts, empty/error states.
- **Production ready** — `npm run build` ke baad Express hi client serve karta hai.

## Quick start

```bash
cd samtube
npm run setup     # root + client dependencies
npm run dev       # API :5000 + Vite :5173
```

Open **http://localhost:5173**

> Node.js 20+ chahiye.

### PostgreSQL + Custom Sections (optional but recommended)

Existing discovery features work **without** a database. Permanent Custom Sections, Login/Signup and per-section feeds need PostgreSQL (local install or hosted, e.g. Render/Supabase):

1. pgAdmin / psql me database banao:
   ```sql
   CREATE DATABASE samtube;
   ```
2. `.env` me apna connection string set karo (password replace karo):
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/samtube
   ```
3. Schema + filter registry seed (9 categories, 200+ topics) apply karo:
   ```bash
   node server/migrate.js
   ```
4. Server **restart** karo (env .env start par hi load hota hai), phir `#/login` se account banao → `#/sections` → **Create section**.

Bina DATABASE_URL ke app poora chalta hai; `/api/sections*` aur `/api/auth/signup|login` clear "Database not configured" message dete hain.

### API key (optional)

App **bina key ke bhi kaam karta hai** (public mode). Official quota, zyada reliability aur faster
responses ke liye:

1. [Google Cloud Console](https://console.cloud.google.com/) me project banao.
2. **YouTube Data API v3** enable karo.
3. API key create karo.
4. Root folder ki `.env` file me paste karo:

```env
YOUTUBE_API_KEY=your_key_here
PORT=5000
```

5. Server restart karo — sidebar me **Live YouTube API** dikhega.

Key sirf server par rehti hai, browser tak kabhi nahi jaati. `.env` gitignored hai.

## Scripts

| Command | Kya karta hai |
| --- | --- |
| `npm run setup` | Root + client dependencies install |
| `npm run dev` | API + Vite dev server saath me |
| `npm run server` | Sirf API (`node --watch`) |
| `npm run client` | Sirf Vite dev server |
| `npm run build` | Client production build (`client/dist`) |
| `npm start` | Express se built client + API serve |
| `npm run preview` | Build + start |

Production:

```bash
npm run build
npm start          # http://localhost:5000
```

## Project structure

```
samtube/
├─ server/
│  ├─ index.js        # Express routes, static client, error handling, auth/sections wiring
│  ├─ db.js           # pg Pool (DATABASE_URL), graceful when not configured
│  ├─ migrate.js      # idempotent migration runner (server/migrations/*.sql)
│  ├─ migrations/     # 001_schema.sql, 002_seed_filters.sql (filter registry)
│  ├─ auth.js         # scrypt password hashing, sessions, requireAuth
│  ├─ authRoutes.js   # /api/auth signup/login/logout/me
│  ├─ sections.js     # /api/sections CRUD, reorder, duplicate, export/import, feeds
│  ├─ filterEngine.js # topic/keyword matching, scoring, Strict/Balanced/Discovery/Custom modes
│  ├─ filterEngine.test.js
│  ├─ youtube.js      # Data API v3 + key-free public provider, normalization
│  └─ cache.js        # TTL cache + in-flight de-duplication
├─ client/
│  ├─ src/
│  │  ├─ components/  # Topbar, Sidebar, Home, Watch, Library, Playlists, About…
│  │  ├─ lib/         # api, store (localStorage), router, formatting, video cache
│  │  ├─ App.jsx      # hash router + layout
│  │  └─ style.css    # design tokens + responsive styles
│  └─ vite.config.js  # /api proxy → :5000
├─ .env.example
└─ package.json
```

## API

| Route | Description |
| --- | --- |
| `GET /api/health` | Status + current mode (`live` / `public`) |
| `GET /api/videos?q=&language=hi\|en&category=&pageToken=&limit=` | Search results + `nextPageToken` |
| `GET /api/video/:id` | Video details |
| `GET /api/related/:id?title=&channel=&language=` | Related videos |
| `GET /api/suggest?q=&language=` | Search suggestions |

## Notes

- Public mode YouTube ke web frontend se data leta hai. Ye unofficial hai aur kabhi bhi break ho sakta hai —
  long-term/production ke liye API key use karo.
- Server responses 10 minute cache hote hain, isliye repeated searches quota nahi khaate.
- Embedded player sirf wahi videos chalata hai jinke owner ne embedding allow ki ho.
- Captions tabhi dikhte hain jab video me requested language ki caption track ho.
- History/likes/playlists browser-specific hain — doosre browser ya incognito me nahi dikhenge.
