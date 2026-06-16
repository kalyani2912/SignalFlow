# SignalFlow — AI-Powered Behavioral Messaging for D2C Brands

SignalFlow reads real-time shopper behavioral signals and sends AI-personalized triggered messages across SMS, email, WhatsApp, and Instagram DM — with a full marketer control layer that makes every AI decision visible, configurable, and trustworthy.

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + Recharts
- **Backend:** Python 3.11 + FastAPI + SQLModel
- **Database:** Neon Postgres (via `DATABASE_URL`)
- **AI:** Anthropic Claude API (`claude-haiku-4-5`)
- **Hosting:** Vercel (frontend) + Railway (backend)

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and configure environment
cp ../.env.example ../.env
# Edit .env with your DATABASE_URL and ANTHROPIC_API_KEY

# Seed the database
python seed.py

# Run the server
uvicorn main:app --reload
```

### Running Tests

```bash
cd backend
pytest tests/ -v
```

## Demo Brand

**Intuitive Designs Studio** — a meaningful expression apparel brand selling T-shirts and family sets at $25-$50. Tagline: "Wear What You Mean."

## Project Structure

```
signalflow/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── database.py          # SQLModel engine setup
│   ├── models.py            # All SQLModel models
│   ├── seed.py              # Database seeder (idempotent)
│   ├── requirements.txt
│   ├── services/
│   │   ├── intent_scorer.py # Behavioral intent scoring
│   │   └── trigger_engine.py# Trigger rule evaluation
│   └── tests/
│       ├── test_intent_scorer.py
│       └── test_trigger_engine.py
├── frontend/               # React + Vite (Phase 2)
├── .env.example
├── .gitignore
└── README.md
```
