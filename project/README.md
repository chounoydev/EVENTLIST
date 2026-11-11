# Eventlist

Responsive Vue 3 + Vite Eventlist app with public event discovery, account registration and sign-in, plus a protected administrator dashboard. Public users can browse upcoming events; active administrators manage events, and the owner manages administrator accounts.

## Run the frontend

```sh
npm install
npm run dev
```

By default, the frontend expects the API at `http://127.0.0.1:8000/api`. Set `VITE_API_URL` in a project `.env` file to point to a different API base URL.

## Deploy the website and API

1. Push the repository to GitHub. The GitHub Actions workflow runs the frontend build and backend tests/build on each push and pull request. Confirm the workflow passes before deploying.
2. In Vercel, import the repository and set **Root Directory** to `project`. The checked-in `vercel.json` configures `npm ci`, `npm run build`, and `dist`. Use Node.js 22.
3. In Render, create a Blueprint from the repository root using [the Render Blueprint](../render.yaml). Set `DATABASE_URL` to the Neon pooled URL, `DATABASE_URL_UNPOOLED` to the direct URL, `OWNER_PASSWORD` to a strong secret, and `CORS_ALLOWED_ORIGINS` to the exact Vercel site origin (scheme and host only, no path). Set `OWNER_NAME` if desired. Do not put database or owner passwords in GitHub or Vercel.
4. Wait for the Render service to finish its first deploy. Its start command applies migrations and creates the owner if missing. Confirm `https://<render-service>.onrender.com/api/health` returns `{"status":"ok"}`.
5. In Vercel, set `VITE_API_URL` for Production and Preview to the actual deployed API base URL ending in `/api`, then redeploy. The checked-in production default is `https://eventlist-api.onrender.com/api`, matching the Render service name in the Blueprint; verify that its `/api/health` endpoint responds successfully after the API is deployed. Set `VITE_MAPBOX_ACCESS_TOKEN` to a public Mapbox `pk.` token so event-location search and maps work. Use a token restricted to the deployed website URLs and required public map/geocoding access. The backend must allow the exact deployed Vercel origin in `CORS_ALLOWED_ORIGINS`.
6. Open the Vercel site, load the public events, and test owner sign-in and an authenticated admin request. A successful Vercel build alone does not verify the API or database.

The Android APK is built from the same Vite production bundle and therefore uses the same `VITE_API_URL` and backend/database as the website. Configure `VITE_API_URL` to the verified deployed API URL in the build environment before running `npm run android:apk`; the command refuses to build if the URL is missing, malformed, or points to localhost. Verify that `<VITE_API_URL without /api>/api/health` returns `{"status":"ok"}` before packaging. The script builds and copies the APK to `public/eventlist-app-debug.apk`. Rebuild it whenever the API URL or frontend changes. APK files are ignored by the repository-wide Git rule; after a valid build, run `git add -f public/eventlist-app-debug.apk` from the `project` directory if the APK download link should be included in the Vercel deployment.

## Exact event locations and Mapbox

Copy `.env.example` to `.env.local` for local Vite development and set `VITE_MAPBOX_ACCESS_TOKEN` to a public Mapbox token. Configure the same variable in Vercel Production and Preview; rebuild the Android APK after setting it if the APK should include maps. Vite variables are bundled into the client and are public, so use a `pk.` token with URL restrictions and only the public styles/tiles/geocoding access the app needs—never use a secret `sk.` token.

When creating or editing an event, select its region, province, city/municipality, and barangay from the PSGC Cloud reference directory. Enter a venue/address, use **Find area on map** to center on Philippine map results, and click the exact venue on the map or drag the pin before saving. Only the coordinates selected by the user on the map are stored; temporary Mapbox search results are not persisted. Clicking an event opens an interactive Mapbox street map with its saved pin and a directions link. Existing events without coordinates can be edited to add a precise pin. PSGC Cloud is community-provided; its structure mirrors the official PSGC, so verify critical geographic data independently. Without a configured Mapbox token, administrative location selection still works, but maps and exact pins do not.

## Public accounts and administrator access

Visitors can browse upcoming events and create a public account from the shared sign-in page. Public accounts can discover events but cannot access the administrator dashboard. The portal owner's email is reserved from public registration.
Events created or updated by administrators are shown in the public upcoming-events listing. Open public pages refresh announcements automatically every 30 seconds and when returning to the tab.
Selecting an upcoming event opens its full details, including the description, date, time, location, organizer, capacity, and cover image when available. The details dialog works with mouse, keyboard, and touch.
Administrators can attach an optional JPG, PNG, GIF, or WebP event cover image (up to 5 MB). Images appear in both the management list and public event cards.
Administrators can also manage the public homepage carousel from the dashboard: create, edit, publish, hide, delete, and order announcement slides. The public carousel refreshes automatically and hides itself when no slides are published.
The admin portal has dedicated Dashboard, Events, Create Event, Calendar, Analytics, and Homepage pages. The owner also has a separate Administrators page. Sidebar navigation switches between these focused views and preserves the selected page in the URL hash.

Run the TypeScript API and PostgreSQL migrations as described in [the backend README](../eventlist-backend/README.md), then create the initial owner with `npm run owner:create`. Use pgAdmin to create and inspect the PostgreSQL database. Only the owner can add or remove administrators from the portal; owner-created administrators can also manage events.

See the backend README for database setup and account permissions.

## Verify the frontend

```sh
npm run build
```
