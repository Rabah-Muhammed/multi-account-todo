# Multi-Account Todo

A production-minded, full-stack Todo application built with Next.js, Django REST Framework, and Auth0. The core design principle is strict account-level data isolation—every authenticated user can only access and modify their own todos, enforced server-side.

## Live Demo

- **Frontend**: [https://multi-account-todo.vercel.app](https://multi-account-todo.vercel.app)
- **Backend API**: [https://multi-account-todo-api.onrender.com/api/todos/](https://multi-account-todo-api.onrender.com/api/todos/)

---

## Features

- **Strict Account Isolation (IDOR Protection)**: Database queries are permanently scoped to the authenticated user's account derived from the verified JWT. Cross-account access returns HTTP 404 with zero data leakage.
- **Auth0 Authentication**: Full login, sign-up, session handling, and logout flow using `@auth0/nextjs-auth0` and Auth0 Universal Login. Backend verifies RS256 JWT signatures against Auth0 JWKS.
- **Todo CRUD**: Create, read, inline edit, toggle completion, and delete tasks with confirmation dialogs.
- **Filters & Search**: Filter tasks by status (`All`, `Active`, `Completed`) and perform real-time search queries by title.
- **Server-Side Pagination**: Standard 10-item pagination supported by Django REST Framework and handled smoothly with Previous/Next UI controls and page counters.
- **Optimistic UI Updates**: Task completion toggles update instantly on the frontend and automatically revert if the backend request fails.
- **Clean, Responsive UI**: Built with Tailwind CSS and Lucide icons, including loading states, empty states, and toast notices.
- **Automated Test Suite**: 13 automated tests covering authentication enforcement, CRUD operations, IDOR protection, account spoofing prevention, status filtering, search, and pagination.
- **Docker Orchestration**: Complete `docker-compose.yml` for running both frontend and backend locally with a single command.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS, `@auth0/nextjs-auth0`)
- **Backend**: Django 5, Django REST Framework, Gunicorn, WhiteNoise
- **Authentication**: Auth0 (RS256 JWT, PyJWT with cryptography)
- **Database**: SQLite for local development; PostgreSQL ready via `dj-database-url` and `psycopg2-binary`
- **Deployment**: Vercel (Frontend), Render (Backend container)

---

## How It Works

### 1. Authentication & Token Proxy
Auth0 handles user credentials and session management. When the user logs in, Next.js stores an encrypted session cookie.

The client browser never directly hits the Django backend with user credentials. Instead, Next.js API route handlers (`/api/todos`) act as a server-side proxy:
1. The route handler calls `auth0.getAccessToken()` to retrieve the user's JWT.
2. It forwards the request to Django with `Authorization: Bearer <token>`.
3. Upstream errors and responses are safely normalized and returned to the client.

### 2. JWT Verification on Django
Django validates every incoming request with a custom `Auth0JWTAuthentication` class:
- Fetches and caches Auth0 public signing keys (`PyJWKClient`) from the Auth0 JWKS endpoint.
- Validates the token's RS256 signature, `issuer`, and `audience`.
- Extracts the `sub` claim (unique Auth0 user ID) and upserts an `Account` record locally via `get_or_create`.

### 3. IDOR Protection (Account-Level Isolation)
Every database query in `TodoViewSet` is constrained to the verified user's account:

```python
def get_queryset(self):
    return Todo.objects.filter(account=self.request.user.account)
```

- **Read/Update/Delete Isolation**: If User A tries to access or modify `/api/todos/<User-B-Todo-ID>/`, DRF's `get_object()` finds no matching record in User A's queryset and immediately returns a `404 Not Found`.
- **Create Isolation**: `perform_create` forces ownership from the verified JWT, ignoring any `account` values provided in the request payload:

```python
def perform_create(self, serializer):
    serializer.save(account=self.request.user.account)
```

---

## Project Structure

```
multi-account-todo/
├── backend/
│   ├── core/
│   │   ├── settings.py          # CORS, DRF, Auth0, WhiteNoise, and DB config
│   │   ├── urls.py              # Root routing (/api/ -> todos.urls)
│   │   ├── authentication.py    # Auth0 RS256 JWT validation & Account upsert
│   │   └── wsgi.py
│   ├── todos/
│   │   ├── models.py            # Account and Todo UUID models
│   │   ├── serializers.py       # TodoSerializer with read-only fields
│   │   ├── views.py             # Scoped TodoViewSet with filter & search
│   │   ├── urls.py              # DefaultRouter registration
│   │   └── tests.py             # 13 APITestCase tests
│   ├── Dockerfile               # Production container running Gunicorn
│   ├── build.sh                 # Render build script (migrate + collectstatic)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/todos/       # Server proxy GET & POST routes
│   │   │   ├── api/todos/[id]/  # Server proxy PATCH & DELETE routes
│   │   │   ├── components/      # TodoDashboard client component
│   │   │   ├── lib/auth0.ts     # Auth0 client instance
│   │   │   ├── page.tsx         # Landing page / Authenticated Dashboard
│   │   │   └── types.ts         # TypeScript interfaces
│   │   └── proxy.ts             # Auth0 Next.js 16 session middleware
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml           # Multi-container orchestration
├── .env.example                 # Sanitized environment template
└── README.md
```

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- An Auth0 Account

### 1. Auth0 Application Configuration
1. In the Auth0 Dashboard, create a **Regular Web Application**.
2. Configure **Application URIs**:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
3. Make note of your **Domain**, **Client ID**, and **Client Secret**.
4. The API Audience default for Auth0 Management is: `https://<your-auth0-domain>/api/v2/`.

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

### 4. Environment Configuration

Create `frontend/.env.local`:
```bash
APP_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=your_64_character_random_string  # openssl rand -hex 32
AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Create root `.env` (for backend / Docker):
```bash
DJANGO_SECRET_KEY=dev-secret-key-change-in-prod
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
```

---

## Running Automated Tests

Run the test suite with:

```bash
cd backend
python manage.py test todos
```

### Test Coverage Summary (13 Tests):
- `test_requires_authentication`: Rejects unauthenticated requests with HTTP 401.
- `test_invalid_token_is_rejected`: Ensures forged/expired tokens cannot access resources.
- `test_create_todo`: Verifies authenticated task creation.
- `test_cannot_spoof_account_on_create`: Ensures `account` in POST payload cannot hijack ownership.
- `test_list_todos_scoped_to_user`: Asserts users only see their own tasks.
- `test_update_todo`: Validates task modification for owner.
- `test_delete_todo`: Validates task deletion for owner.
- `test_idor_get_other_user_todo_returns_404`: Confirms fetching another user's task returns 404.
- `test_idor_update_other_user_todo_returns_404`: Confirms modifying another user's task returns 404.
- `test_idor_delete_other_user_todo_returns_404`: Confirms deleting another user's task returns 404.
- `test_filter_by_status`: Tests `?status=active` and `?status=completed` query params.
- `test_search_by_title`: Tests `?search=<query>` param on title.
- `test_api_pagination`: Tests pagination response shape (`results`, `count`, `next`, `previous`).

---

## Docker Setup

Run both services with a single command:

```bash
cp .env.example .env    # Configure your Auth0 credentials
docker compose up --build
```

- Frontend accessible at: `http://localhost:3000`
- Backend API accessible at: `http://localhost:8000/api/`

---

## Public Deployment Notes

### Backend on Render
- **Runtime**: Docker (builds `backend/Dockerfile` with Gunicorn WSGI server)
- **Startup Command**: `python manage.py migrate && gunicorn core.wsgi:application --bind 0.0.0.0:8000`
- **Required Environment Variables**:
  - `DJANGO_SECRET_KEY`: Strong production secret
  - `DJANGO_DEBUG`: `False`
  - `DJANGO_ALLOWED_HOSTS`: `*` (or `.onrender.com`)
  - `CORS_ALLOWED_ORIGINS`: `https://multi-account-todo.vercel.app`
  - `AUTH0_DOMAIN`: Auth0 tenant domain
  - `AUTH0_AUDIENCE`: Auth0 API audience
  - `DATABASE_URL`: *(Optional)* Render PostgreSQL internal connection string

### Frontend on Vercel
- **Framework**: Next.js (Root Directory set to `frontend`)
- **Required Environment Variables**:
  - `APP_BASE_URL`: `https://multi-account-todo.vercel.app`
  - `AUTH0_DOMAIN`: Auth0 tenant domain
  - `AUTH0_CLIENT_ID`: Auth0 Client ID
  - `AUTH0_CLIENT_SECRET`: Auth0 Client Secret
  - `AUTH0_SECRET`: 64-character encryption secret
  - `AUTH0_AUDIENCE`: Auth0 API audience
  - `NEXT_PUBLIC_API_URL`: `https://multi-account-todo-api.onrender.com/api`

### Auth0 Production URIs
In Auth0 Dashboard -> Application Settings:
- **Allowed Callback URLs**: `http://localhost:3000/auth/callback, https://multi-account-todo.vercel.app/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000, https://multi-account-todo.vercel.app`
- **Allowed Web Origins**: `http://localhost:3000, https://multi-account-todo.vercel.app`