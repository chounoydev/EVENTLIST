# Eventlist

Responsive Vue 3 + Vite Eventlist app with public event discovery, account registration and sign-in, plus a protected administrator dashboard. Public users can browse upcoming events; active administrators manage events, and the owner manages administrator accounts.

## Run the frontend

```sh
npm install
npm run dev
```

By default, the frontend expects the API at `http://127.0.0.1:8000/api`. Set `VITE_API_URL` in a project `.env` file to point to a different API base URL.

## Public accounts and administrator access

Visitors can browse upcoming events and create a public account from the shared sign-in page. Public accounts can discover events but cannot access the administrator dashboard. The portal owner's email is reserved from public registration.
Events created or updated by administrators are shown in the public upcoming-events listing. Open public pages refresh announcements automatically every 30 seconds and when returning to the tab.
Selecting an upcoming event opens its full details, including the description, date, time, location, organizer, capacity, and cover image when available. The details dialog works with mouse, keyboard, and touch.
Administrators can attach an optional JPG, PNG, GIF, or WebP event cover image (up to 5 MB). Images appear in both the management list and public event cards.
Administrators can also manage the public homepage carousel from the dashboard: create, edit, publish, hide, delete, and order announcement slides. The public carousel refreshes automatically and hides itself when no slides are published.
The admin portal has dedicated Dashboard, Events, Create Event, Calendar, Analytics, and Homepage pages. The owner also has a separate Administrators page. Sidebar navigation switches between these focused views and preserves the selected page in the URL hash.

Run the Laravel backend and database migrations, then bootstrap the owner with `php artisan eventlist:bootstrap-owner`. The command prompts for the initial owner's password. Only the owner can add or remove administrators from the portal; owner-created administrators can also manage events.

See the backend README for database setup and account permissions.

## Verify the frontend

```sh
npm run build
```
