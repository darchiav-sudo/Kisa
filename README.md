# Kisa

Native Expo + React Native + TypeScript app. Kisa prepares money / sales **Launches**; you approve the human steps.

## Modes

- **I need a way to make money** — NE Philly profile → Leaf Cleanup primary (no spend before signal) + Philly alternatives
- **I already have a business / product** — Books in Tbilisi → 48H Book Drop + zero-ad channels

## Run

```bash
npm install
npx expo start
```

Useful variants:

```bash
npx expo start --web --port 47831
npx expo start --android
npx expo start --ios
```

Typecheck:

```bash
npx tsc --noEmit
```

## Demo paths

1. Home → **I need a way to make money** → keep NE Philly / $200 / 2–3h / car / either → Analyze → open **Leaf Cleanup** → run every step (publish → lead → book → **then** kit → job → $49).
2. Home → **I already have a business** → Books / Tbilisi / 0 GEL → Analyze → **48H Book Drop** → offer → Story → DM → fulfillment → 49₾.

Progress, profiles, and demo earnings persist via Zustand + AsyncStorage.

## Stack

Expo Router, Safe Area, Zustand, AsyncStorage, TypeScript. All opportunity / publish / lead services are mocked under `src/services/mocks`.

## Backend (Railway + Neon)

API lives in `backend/` (Hono + Neon Postgres).

| Env | URL |
|-----|-----|
| development | https://api-development-471e.up.railway.app |
| production | https://kisa-api-production.up.railway.app |

Health: `GET /health`

The Expo app uses `EXPO_PUBLIC_API_URL` or `app.json` → `extra.apiUrl` (defaults to development). Without it, local mocks still work.

Neon project **Kisa** (`odd-feather-72183390`): branch `main` → production, branch `develop` → development.

