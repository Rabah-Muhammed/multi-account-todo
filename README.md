# Multi-Account Todo

A full-stack todo application built with Next.js, Django REST Framework, and Auth0.

The primary requirement is account-level data isolation: every todo belongs to the user who created it, and users can only ever access or modify their own tasks.

## Live Demo

- **Frontend**: [https://multi-account-todo.vercel.app](https://multi-account-todo.vercel.app)
- **Backend API**: [https://multi-account-todo-api.onrender.com/api/todos/](https://multi-account-todo-api.onrender.com/api/todos/)

---

## Overview & Architecture

The application is split into two independent services:

1. **Next.js frontend (App Router)**: Handles the UI, Auth0 login/logout flow, and routes API requests through server-side proxy handlers (`/api/todos`). The browser never contacts the Django API directly with user tokens; Next.js extracts the access token from the session on the server and forwards it to Django in the `Authorization: Bearer <token>` header.
2. **Django backend (DRF)**: Validates incoming RS256 JWTs against Auth0's public keys (`.well-known/jwks.json`). When a valid token arrives, Django extracts the `sub` claim (Auth0 user ID) and looks up or creates a local `Account` record.
3. **Database**: SQLite for local development, with PostgreSQL supported via `DATABASE_URL` (configured using `dj-database-url`).

### Data Isolation & IDOR Prevention

Preventing cross-account access (IDOR) is handled at the database query layer:

- **Queries (`get_queryset`)**: Every query is filtered by the authenticated user's account:
  ```python
  def get_queryset(self):
      return Todo.objects.filter(account=self.request.user.account)
  ```
  Because Django REST Framework routes all `GET`, `PATCH`, and `DELETE` detail requests through `get_queryset`, trying to access another user's todo ID returns a `404 Not Found`. Returning 404 instead of 403 prevents leaking whether that ID exists.

- **Creation (`perform_create`)**: Even if a request body contains an `account` field, the serializer ignores it because `account` is omitted from writable fields. The view explicitly assigns ownership from the token:
  ```python
  def perform_create(self, serializer):
      serializer.save(account=self.request.user.account)
  ```

---

## Features

- User authentication with Auth0 (signup, login, session management, logout)
- Todo CRUD (create, view, inline edit, toggle status, delete with confirmation)
- Status filter tabs (All, Active, Completed) and real-time search by title
- Server-side pagination (10 items per page) with Previous/Next controls
- Optimistic toggle in the UI (reverts automatically if the request fails)
- 13 backend test cases covering auth, CRUD, IDOR isolation, and pagination
- Docker Compose setup for running both services locally with one command

---

## Project Structure

```
multi-account-todo/
├── backend/
│   ├── core/
│   │   ├── authentication.py   # Auth0 JWT validation & Account lookup
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── todos/
│   │   ├── models.py           # Account and Todo models (UUID primary keys)
│   │   ├── serializers.py
│   │   ├── views.py            # Scoped TodoViewSet with filter & search
│   │   ├── urls.py
│   │   └── tests.py            # 13 APITestCase tests
│   ├── Dockerfile              # Container running Gunicorn
│   ├── build.sh
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/todos/      # Server-side proxy routes
│   │   │   ├── components/     # TodoDashboard component
│   │   │   ├── lib/auth0.ts
│   │   │   ├── page.tsx
│   │   │   └── types.ts
│   │   └── proxy.ts            # Auth0 session middleware
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## Running Locally

### Prerequisites

- Python 3.12+
- Node.js 20+
- An Auth0 account (free tier)

### 1. Configure Auth0

In your Auth0 dashboard, create a **Regular Web Application** and set:
- **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

Your audience is `https://<your-tenant>.us.auth0.com/api/v2/`.

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Environment Variables

Create `frontend/.env.local`:
```bash
APP_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-64-char-secret            # run: openssl rand -hex 32
AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Create root `.env` (for backend & Docker):
```bash
DJANGO_SECRET_KEY=dev-secret-key-change-in-prod
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
```

---

## Running with Docker

To run both services together:

```bash
cp .env.example .env    # fill in your Auth0 credentials
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/`

---

## Tests

Run the backend test suite:

```bash
cd backend
python manage.py test todos
```

The 13 tests cover:
- Rejecting requests without a token (401)
- Rejecting invalid or forged tokens (401)
- Creating, listing, updating, and deleting todos
- IDOR prevention: attempting to read, update, or delete another user's todo returns 404
- Account spoofing prevention: passing another user's account ID in POST payload is ignored
- Status filtering (`?status=active`, `?status=completed`)
- Search by title (`?search=...`)
- Pagination response format and page sizing (10 items/page)

---

## Deployment Notes

- **Backend (Render)**: Deployed as a Docker web service running Gunicorn. Container startup command runs `python manage.py migrate` before launching Gunicorn so database tables are ready.
- **Frontend (Vercel)**: Deployed with root directory set to `frontend`.
- For production, Auth0's Allowed Callback, Logout, and Web Origin URLs include both `localhost:3000` and `https://multi-account-todo.vercel.app`.