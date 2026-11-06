# Eventlist API

Laravel 12 API for Eventlist public event discovery and the administrator portal.

## Run locally

Install dependencies if needed, configure `.env`, then prepare the database:

```sh
composer install
php artisan migrate
php artisan serve --host 127.0.0.1 --port 8000
```

The database is SQLite at `database/database.sqlite`. The Vite development origins `http://localhost:5173` and `http://127.0.0.1:5173` are allowed by default. For another frontend origin, set `CORS_ALLOWED_ORIGINS` to a comma-separated list of exact origins in `.env`.

## Create the initial portal owner

To create or activate the initial owner account, run this command on the trusted machine hosting the backend:

```sh
php artisan eventlist:bootstrap-owner
```

The command is restricted to `johndegamo45@gmail.com` by default, prompts for the owner's name and password without echoing the password, and activates the owner account. Use a unique password with at least 12 characters, uppercase and lowercase letters, a number, and a symbol. If that email already exists from an earlier development setup, the command promotes that same account and replaces its password. Accounts created before the access-control migration remain inactive unless explicitly provisioned; new public registrations are active user accounts without portal access.

Set `EVENTLIST_OWNER_EMAIL` in `.env` only if you intentionally need to change the allowlisted owner address.

If the owner password is forgotten, reset it from the trusted backend machine. The command prompts for the new password without echoing it and revokes existing owner sessions:

```sh
php artisan eventlist:bootstrap-owner --reset-password
```

## Portal access

- `POST /api/register` creates an active public `user` account and returns its bearer token. The portal owner email is reserved and cannot be claimed through public registration.
- `POST /api/login` accepts `email` and `password`; inactive accounts cannot sign in.
- Login returns a Sanctum bearer token and the signed-in user. Tokens expire after 30 days.
- Send the token in `Authorization: Bearer <token>` for protected endpoints.
- `POST /api/logout` revokes the current token; `GET /api/user` returns the signed-in user.
- `GET /api/public/events` lists events for public pages without requiring an account.
- `GET /api/public/slides` lists active homepage carousel slides without requiring an account.
- Events saved or updated by an administrator are available through the public events listing.
- The `hero_slides` table is created by `php artisan migrate` and starts with the three default homepage announcements. Active administrators can list, create, update, and delete slides through `/api/admin/slides`; the dashboard controls their visibility and display order.
- Administrators may upload JPG, PNG, GIF, or WebP cover images up to 5 MB. Configure the public storage link with `php artisan storage:link` so cover URLs can be served by Laravel.
- Authenticated active administrators can manage event records under `/api/events`.
- Public user accounts can sign in and view events but cannot access administrator APIs or the management dashboard.
- Only the portal owner can access `/api/admin/admins` to list, add, or remove administrators.
- New admins are active immediately and are assigned the password entered by the owner. Share it through a secure channel. Admin accounts cannot create or remove other admins.

Authentication and administrator creation endpoints are rate-limited. Passwords are hashed by Laravel and are never returned by the API.

## Tests

```sh
php artisan test
```
