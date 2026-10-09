# Kisa

Native Expo + React Native + TypeScript app. Kisa finds one tiny business that fits you, builds it
(name, price, website, posts, reply scripts) and then runs it with you day by day.

## App flow

- **Sign in** with Google.
- **Onboarding**: one-tap questions (start new / sell existing, location via permission, budget,
  what you have, what you are good at, languages, where you work). Answers are remembered.
- **Idea**: Kisa researches your area live and shows one idea. Build it, save it, or ask for another.
- **Building**: Kisa creates the business kit and a public order page.
- **Tabs**: Home (today's tasks, check-in, orders, website), New (one-tap search with saved answers),
  Saved (businesses you can switch between + saved ideas), Profile (answers, sign out, delete account).

## Run

```bash
npm install
npx expo start --tunnel
```

Typecheck:

```bash
npx tsc --noEmit
```

## Stack

Expo Router, Safe Area, Zustand, AsyncStorage, SecureStore, expo-location, expo-haptics, TypeScript.

## Backend (Railway + Neon)

API lives in `backend/` (Hono + Neon Postgres). Deploy with `railway up --ci --service api --environment development` from `backend/`.

| Env | URL |
|-----|-----|
| development | https://api-development-471e.up.railway.app |
| production | https://kisa-api-production.up.railway.app |

Health: `GET /health`

### Accounts (Google sign-in)

All `/v1/*` routes require `Authorization: Bearer <token>`. Two ways to get one:

- **Expo Go / fallback**: the backend runs the Google OAuth flow in an in-app auth sheet
  (`/auth/google/start` → Google → `/auth/google/callback` → app deep link with a one-time code →
  `POST /auth/exchange`).
- **Development / store builds**: the native Google account sheet
  (`@react-native-google-signin/google-signin`) returns an ID token, verified by
  `POST /auth/google/id-token`.

Railway variables per environment:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client (type *Web application*) |
| `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` | optional, native clients allowed as ID-token audiences |
| `OPENAI_API_KEY` | OpenAI key used for research + generation |
| `OPENAI_LAUNCH_MODEL` | optional, defaults to `gpt-5.4-mini` |

Authorized redirect URI on the Google web client: `https://<api domain>/auth/google/callback`.

To enable the native sheet in a development build:

1. In Google Cloud create an **iOS** OAuth client (bundle `com.kisa.app`) and an **Android** client
   (package `com.kisa.app` + the build's SHA-1).
2. Put the iOS client ID in `app.json` → `extra.googleIosClientId`, and add its reversed form as
   `iosUrlScheme` on the `@react-native-google-signin/google-signin` plugin.
3. `eas build --profile development`.

### Business API

| Route | What it does |
|-------|--------------|
| `POST /v1/ideas/find` | live research → one idea |
| `GET/POST /v1/ideas/saved`, `DELETE /v1/ideas/saved/:id` | saved ideas |
| `POST /v1/businesses` | build kit + tasks, becomes the active business |
| `GET /v1/businesses`, `GET /v1/businesses/current` | list / active business |
| `POST /v1/businesses/:id/activate`, `DELETE /v1/businesses/:id` | switch to / pause a business |
| `POST /v1/businesses/:id/checkins` | log what happened, Kisa re-plans tasks |
| `DELETE /v1/me` | delete account and all data |

Public order pages: `GET /b/:slug`.

Neon project **Kisa** (`odd-feather-72183390`): branch `main` → production, branch `develop` → development.
