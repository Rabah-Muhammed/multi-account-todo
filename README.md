# Multi-Account Todo

A full-stack todo app built with Next.js, Django REST Framework, and Auth0. The main focus is correct account-level data isolation — every user can only ever access their own todos, enforced on the backend.

## Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Backend**: Django 5, Django REST Framework
- **Auth**: Auth0 (RS256 JWT)
- **Database**: SQLite for local dev, PostgreSQL supported via `DATABASE_URL`

## How it works

Auth0 handles login and issues a signed JWT. The Next.js frontend never calls Django directly — instead, Next.js API routes act as a server-side proxy that attach the access token to each request before forwarding it to Django.

On the Django side, every incoming request goes through a custom authentication class that validates the JWT against Auth0's public keys. The `sub` claim (Auth0 user ID) is used to look up or create a local `Account` record. From that point on, every database query is scoped to that account:

```python
def get_queryset(self):
    return Todo.objects.filter(account=self.request.user.account)
```

This means if User A tries to hit `/api/todos/<User-B-Todo-ID>/`, Django finds nothing in User A's queryset and returns a plain `404`. No data leaks, no existence hints.

Ownership on create is also enforced server-side:

```python
def perform_create(self, serializer):
    serializer.save(account=self.request.user.account)
```

Even if someone sends `{"account": "<other-user-id>"}` in the request body, it is ignored. The account is always taken from the verified token.

## Project structure

```
multi-account-todo/
├── backend/
│   ├── core/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── authentication.py   # Auth0 JWT validation
│   └── todos/
│       ├── models.py            # Account and Todo models
│       ├── serializers.py
│       ├── views.py             # Scoped TodoViewSet
│       └── tests.py             # Auth, CRUD, and IDOR tests
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── api/todos/       # Server-side proxy to Django
│       │   ├── components/      # TodoDashboard
│       │   └── lib/auth0.ts
│       └── proxy.ts             # Auth0 middleware
├── docker-compose.yml
└── .env.example
```

## Local setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- An Auth0 account

### Auth0 configuration

1. Create a **Regular Web Application** in your Auth0 dashboard.
2. Under **Application URIs**, set:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
3. Save changes.
4. Your API Audience is: `https://<your-auth0-domain>/api/v2/`

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` from the example below and fill in your values.

### Environment variables

`frontend/.env.local`:
```bash
APP_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=            # generate with: openssl rand -hex 32
AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Backend (root `.env`):
```bash
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
```

### Running tests

```bash
cd backend
source venv/bin/activate
python manage.py test todos
```

The test suite covers unauthenticated rejection, full CRUD for authenticated users, cross-account IDOR attempts (GET, PATCH, DELETE all return 404), account spoofing attempts via the request body, and status filtering and search.

### Docker

```bash
cp .env.example .env   # fill in your credentials
docker compose up
```