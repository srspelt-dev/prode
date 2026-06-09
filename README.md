# 🏆 Prode Mundial 2026

App de pronósticos para el Mundial, construida **todo en Next.js 14** (frontend + API) con MongoDB. Pensada para desplegar en **Vercel** con un solo deploy, o en cualquier lado vía **Docker**.

- Pronósticos con deadline (5 min antes del partido)
- Scoring automático (6 / 4 / 3 / 0 pts)
- Tabla global + ligas privadas con código
- Sincronización de partidos y resultados desde **API-Football**
- Panel de admin para cargar resultados a mano y forzar sync

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend + API | Next.js 14 (App Router) + TypeScript |
| Base de datos | MongoDB (driver nativo) |
| Auth | JWT propio (`jose`) en cookie httpOnly + `bcryptjs` |
| Datos del Mundial | football-data.org (Mundial 2026 gratis) |
| Tareas programadas | Vercel Cron (o cron externo) |
| Estilos | Tailwind CSS |

---

## Puesta en marcha (desarrollo local)

### Opción A — con Docker (recomendado para la base)

```bash
cp .env.local.example .env.local      # editá los secretos
docker compose up -d mongo            # levanta MongoDB en localhost:27017
npm install
npm run seed                          # datos de prueba + usuario admin
npm run dev                           # http://localhost:3000
```

> Usuario admin del seed: el email de `ADMIN_EMAIL` con contraseña `admin123`.
> (Registralo desde la web con ese email para fijar la contraseña que quieras, o usá la del seed.)

Para inspeccionar la base con una UI web:
```bash
docker compose --profile tools up -d mongo-express   # http://localhost:8081
```

### Opción B — la app entera en Docker

```bash
cp .env.local.example .env.local
docker compose up --build             # app en :3000 + mongo
```

### Opción C — sin Docker

Necesitás un MongoDB corriendo (local o Atlas). Apuntá `MONGODB_URI` a él y:
```bash
npm install && npm run seed && npm run dev
```

---

## Variables de entorno

Ver [.env.local.example](.env.local.example). Las clave:

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | Conexión a Mongo (local o Atlas) |
| `JWT_SECRET` | Firma de los tokens de sesión — generá uno con `openssl rand -base64 32` |
| `ADMIN_EMAIL` | El usuario que se registre con este email queda como admin |
| `FOOTBALL_DATA_TOKEN` | Token de football-data.org (gratis, incluye Mundial 2026) |
| `CRON_SECRET` | Protege el endpoint `/api/cron/sync` |

---

## Scoring

| Situación | Puntos |
|---|---|
| Resultado exacto | 6 |
| Ganador correcto + diferencia de goles exacta | 4 |
| Ganador / empate correcto | 3 |
| No acertó | 0 |

Lógica en [src/lib/scoring.ts](src/lib/scoring.ts). En partidos definidos por penales se usa el resultado **previo a la tanda** (tiempo extra si lo hubo, si no los 90').

---

## Sincronización con football-data.org

> Usamos **football-data.org** porque su plan **gratuito incluye el Mundial 2026** (competición `WC`),
> con los 104 partidos y equipos reales ya cargados. (API-Football, en cambio, exige plan pago para 2026.)

1. Registrate gratis en https://www.football-data.org/client/register y copiá tu token a `FOOTBALL_DATA_TOKEN`.
2. Mundial 2026 ya viene por defecto: `FOOTBALL_DATA_COMPETITION=WC`.
3. El primer sync lo podés disparar desde el **panel de admin** (botón "Sync fixture") o llamando a `POST /api/matches/sync` como admin.

### Cron automático

Definido en [vercel.json](vercel.json) (compatible con Vercel Hobby/gratis, 1 cron/día):

| Job | Frecuencia | Qué hace |
|---|---|---|
| `/api/cron/sync?mode=all` | 04:00 UTC | refresca el fixture completo |

**Actualización en vivo (gratis):** Vercel Hobby solo permite 1 cron/día, así que para los partidos
en vivo se usa un **cron externo gratis** como [cron-job.org](https://cron-job.org):

1. Creá un job que pegue cada 1-2 min a:
   `https://TU-APP.vercel.app/api/cron/sync?mode=live`
2. En "Headers" agregá: `Authorization: Bearer <CRON_SECRET>`
3. El endpoint ya se autoprotege con `CRON_SECRET` y no gasta cuota si no hay partidos próximos.

(El cron de 2 min nativo de Vercel requiere plan Pro; con el cron externo queda todo gratis.)

### Cuota de la API

El plan gratuito de football-data.org permite **10 requests/minuto** — más que suficiente. Un sync completo del fixture es **1 sola request** (trae los 104 partidos). El job en vivo evita gastar requests si no hay partidos en las próximas 2 hs. No hace falta plan pago para el Mundial 2026.

---

## Despliegue en Vercel

1. Subí el repo a GitHub.
2. Importalo en Vercel.
3. Cargá las variables de entorno (las mismas de `.env.local`, con `MONGODB_URI` apuntando a **MongoDB Atlas**).
4. Deploy. Vercel detecta `vercel.json` y registra los cron jobs automáticamente.

MongoDB Atlas tiene free tier (M0) suficiente para el MVP.

---

## Despliegue con Docker (Railway / Render / VPS)

```bash
docker build -t prode-mundial .
docker run -p 3000:3000 --env-file .env.local prode-mundial
```

La imagen usa el `output: standalone` de Next. En este modo el cron de Vercel **no** corre: usá un cron externo apuntando a `/api/cron/sync`.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                 login / registro
│   ├── partidos/                lista de partidos + pronósticos
│   ├── tabla/                   ranking global
│   ├── ligas/                   crear/unirse + tabla por liga
│   ├── cuenta/                  perfil + historial
│   ├── admin/                   cargar resultados + sync
│   └── api/                     todos los endpoints (route handlers)
├── components/                  NavBar, MatchCard, Leaderboard, ScoreBadge
└── lib/
    ├── mongodb.ts               conexión cacheada
    ├── auth.ts                  JWT + cookies
    ├── scoring.ts               cálculo de puntos
    ├── scoring-service.ts       recálculo masivo por partido
    ├── football-data.ts         cliente football-data.org
    ├── sync.ts                  transforma y upserta a Mongo
    ├── leaderboard.ts           agregación del ranking
    └── types.ts
```

---

## Nota de seguridad

Esta versión usa `next@14.2.x` (última con parches de la línea 14). Algunos avisos de `npm audit` solo se cierran subiendo a **Next 16** (requiere React 19) — pendiente como mejora futura, no bloquea el MVP.
