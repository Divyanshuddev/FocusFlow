# FocusFlow – Smart Focus Mode

FocusFlow is a full-stack productivity workspace built with **Next.js (App Router, TypeScript, Tailwind CSS)** and **FastAPI (SQLAlchemy, Alembic, PostgreSQL, JWT)**. It helps users plan high-leverage work, protect distraction-free deep focus blocks, manually log interruptions, and analyze productivity patterns over time.

---

## Core Modules & Capabilities

- **Authentication & Profile Management**: Registration, login, logout, JWT access/refresh token rotation, forgot/reset password flow, profile & password updates.
- **Smart Productivity Dashboard**: Daily productivity score (0–100 with transparent rule-based breakdown), today's focus hours, completed tasks, active streak, daily goal progress, quick timer widget, upcoming tasks, and 7-day productivity chart.
- **Focus Mode (Core Feature)**:
  - Circular animated Pomodoro timer (`25m` focus, `5m` short break, `15m` long break, plus custom durations and user-configured defaults).
  - Persistent session state backed by wall-clock timestamps + `localStorage` so the countdown survives page navigation and browser refreshes.
  - Full-screen distraction-free interface (`F` / `Space` / `Esc` shortcuts), visual atmosphere presets, and procedural Web Audio ambient soundscapes (`Rain`, `Brown Noise`, `Forest`, `Lo-Fi Drone`).
  - Automatic session completion modal prompting the user whether they completed the linked task.
- **Smart Task Management**: Full CRUD, status & priority filtering, search, and a deterministic rule-based **"Focus Next"** priority engine weighing urgency (deadline proximity), importance/priority, estimated effort fit, and in-progress momentum.
- **Manual Distraction Tracking**: Categorized manual logging (`Social Media`, `Entertainment`, `Notifications`, `Multitasking`, `Other`), duration tracking, daily/weekly totals, and rule-based pattern insights. *(No automated browser/tab tracking is performed without an explicit browser extension.)*
- **Productivity Analytics**: Interactive Recharts dashboards for daily focus time, weekly & monthly trends, completed vs. pending task ratios, session completion rate, average focus duration, most productive day, and distraction frequency.
- **Daily Goals & Streaks**: Configurable daily focus targets, streak calculation, 35-day activity progress calendar, and contextual motivational feedback.

---

## Project Structure

```text
.
├── backend/
│   ├── alembic/                  # Database migrations (0001_initial_schema)
│   ├── app/
│   │   ├── models/               # SQLAlchemy ORM models (User, Task, FocusSession, Distraction, DailyGoal)
│   │   ├── routers/              # FastAPI REST endpoints
│   │   ├── schemas/              # Pydantic v2 validation schemas
│   │   ├── services/             # Auth, task scoring, analytics, and productivity logic
│   │   ├── utils/                # Password hashing & JWT security helpers
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   └── seed.py               # Idempotent sample data seeder
│   ├── tests/                    # Pytest API & integration tests
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                      # Next.js App Router pages
│   ├── components/               # Layout shell, providers, timer, modals
│   ├── hooks/                    # Context hooks (useAuth, useFocusTimer, useTheme, useToast)
│   ├── lib/                      # Axios client + token refresh, utilities, Web Audio engine
│   ├── services/                 # Typed REST API service modules
│   ├── types/                    # TypeScript interfaces
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## Running with Docker Compose (Recommended for PostgreSQL)

1. Ensure Docker and Docker Compose are installed.
2. Start PostgreSQL, the FastAPI backend (automatically runs `alembic upgrade head` and seeds demo data), and the Next.js frontend:

```bash
docker compose up --build
```

3. Access the services:
   - **Web App**: `http://localhost:3000`
   - **Backend API**: `http://localhost:8000`
   - **Swagger / OpenAPI Docs**: `http://localhost:8000/docs`

---

## Running Locally Without Docker

### 1. Backend Setup (FastAPI + PostgreSQL)

Create a PostgreSQL database named `focusflow` (or adjust `DATABASE_URL` in `backend/.env`):

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Seed sample development data (optional)
python -m app.seed

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Note for quick local evaluation without PostgreSQL installed**: You may temporarily set `DATABASE_URL=sqlite:///./focusflow.db` in `backend/.env` before running `alembic upgrade head` and `python -m app.seed`.

### 2. Frontend Setup (Next.js)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Demo Account Credentials

If you ran `python -m app.seed` (or Docker Compose):
- **Email**: `demo@focusflow.app`
- **Password**: `FocusFlow123!`

You can also click **Try Demo Workspace** on the landing page or **Fill Demo** on `/login`.

---

## Running Tests & Build Verification

```bash
# Backend API & smart productivity tests
cd backend
.venv/bin/pytest -v

# Frontend TypeScript & production build check
cd ../frontend
npx tsc --noEmit
npm run lint
npm run build
```

---

## Deploying to Render (Backend) & Vercel (Frontend)

### 1. Deploy Backend + PostgreSQL on Render
1. Push this repository to GitHub/GitLab.
2. In Render, choose **New → Blueprint** and select the repo (uses [render.yaml](file:///home/divyanshu/Rough/Project/render.yaml)), **or** create a PostgreSQL database and a Python Web Service manually with:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Environment variables on the Render Web Service:
   - `PYTHON_VERSION`: `3.12.3`
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `false`
   - `DATABASE_URL`: Internal Database URL from Render PostgreSQL (`postgres://` is normalized automatically)
   - `SECRET_KEY`: Random generated secret string
   - `FRONTEND_URL`: `https://your-app.vercel.app`
   - `CORS_ORIGINS`: `https://your-app.vercel.app`
   - `CORS_ORIGIN_REGEX`: `https://.*\.vercel\.app` (optional, enables Vercel preview URLs)

### 2. Deploy Frontend on Vercel
1. In Vercel, import the same repository and set **Root Directory** to `frontend` (uses [frontend/vercel.json](file:///home/divyanshu/Rough/Project/frontend/vercel.json)).
2. Add the environment variable:
   - `NEXT_PUBLIC_API_URL`: `https://your-focusflow-api.onrender.com` (no trailing slash needed; trailing slashes are stripped automatically)
   - `NEXT_PUBLIC_APP_NAME`: `FocusFlow`
3. Deploy, then copy your live Vercel domain back into `FRONTEND_URL` and `CORS_ORIGINS` on Render and redeploy/save if needed.

