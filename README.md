# FlixKiss Web

React frontend for the FlixKiss backend (`../movies_backend`): a public movie catalog with HLS playback, and a restricted admin dashboard.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, TanStack Query 5, React Hook Form + Zod, hls.js, Lucide icons. Tests use Vitest and Testing Library.

## Running it

The backend must be running first (`docker compose up -d` in `movies_backend`, API on port 8000).

### Development

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:8000`, so the browser only talks to one origin. The admin cookie stays first-party and CORS isn't involved. To proxy somewhere else, set `VITE_DEV_API_PROXY_TARGET` (see `.env.example`).

### Production (Docker)

From `movies_backend/`:

```bash
docker compose --profile frontend up -d --build     # http://localhost:3000
```

nginx serves the build and proxies `/api` to the `api` service by its service name (inside a container, `localhost` is the container itself). It also sends CSP and other security headers. The service sits behind a compose profile, so a plain `docker compose up` behaves exactly as before. To change the port, set `FRONTEND_PORT`.

### First admin account

There's no public sign-up. Create the first superuser with the backend CLI. It prompts for the password:

```bash
docker compose exec api python -m app.manage create-admin --email you@example.com --superuser
```

After that, superusers can add other admins from **Dashboard → Administrators**.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR and the API proxy |
| `npm run build` | Type-checks, then builds to `dist/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest unit and component tests |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | empty | API origin as seen by the browser. Leave it empty for same-origin `/api`. If you set another origin, add this app's origin to the backend's `CORS_ORIGINS` and to the nginx CSP `connect-src`. |
| `VITE_DEV_API_PROXY_TARGET` | `http://localhost:8000` | Dev server only: where Vite proxies `/api`. |

## Structure

```
src/
  api/          HTTP client (base URL, credentials, typed ApiError, 401 events) and endpoint modules
  types/        API response types, mirroring app/schemas.py
  hooks/        TanStack Query hooks, session, debounce, lazy-load-on-scroll
  lib/          Formatting, stream source selection, pagination, redirect safety
  components/
    ui/         Button, Field/Input/Select, Dialog, Toast, Pagination, TagInput, feedback states
    movies/     MovieCard, MovieRow, MovieGrid, HeroBanner, Artwork (image + fallback), SearchBox
    player/     VideoPlayer (custom controls, hls.js / native HLS, source fallback)
    admin/      Dashboard blocks
  layouts/      PublicLayout (header/footer), AdminLayout (sidebar)
  pages/        Home, Browse, Movie, NotFound, admin/*
  routes/       Router, admin guard, error boundary
```

## How it maps to the API

| UI | Endpoint |
| --- | --- |
| Home rows, Browse, search | `GET /api/movies` (`search`, `category`, `genre`, `source`, `has_stream`, `sort`, `order`, `page`, `limit`) |
| Category/genre navigation | `GET /api/movies/facets` |
| Movie page | `GET /api/movies/{id}`, `GET /api/movies/{id}/related` |
| Playback | `GET /api/movies/{id}/play.m3u8`. For Fawesome titles the adaptive master playlist is tried first, through `GET /api/stream/proxy`. |
| Subtitles | The `subtitles[].url` values (`/api/subtitles/...`, `/api/generated-subtitles/...`) |
| Login/session | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Dashboard | `GET /api/admin/stats` |
| Movie management | `GET /api/movies`, `PATCH`/`DELETE /api/admin/movies/{id}` |
| Scraper | `GET /api/scrape/status`, `POST /api/scrape/catalog`, `/movie/{id}`, `/fawesome/catalog`, `/fawesome/movie/{id}` |
| Subtitle jobs | `GET/POST /api/subtitle-jobs`, `POST /api/subtitle-jobs/{id}/retry` |
| Administrators | `GET/POST /api/admin/users`, `PATCH /api/admin/users/{id}` |

The movie's `tmdb_id` is the route id (`/movie/:id`). For Fawesome rows it holds the Fawesome id, so the UI never assumes it's a TMDB id.

## Security notes

- Every admin API call is authorized by the backend. The route guard only decides what to render.
- The session token lives in an HttpOnly, `SameSite=Strict` cookie. JavaScript never sees it.
- Raw upstream stream URLs are never handed to the player. Playback always goes through the backend proxy.
- Post-login redirects only accept `/admin...` paths, so there's no open redirect.
