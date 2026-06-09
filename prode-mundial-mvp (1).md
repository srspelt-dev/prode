# 🏆 Prode Mundial — Especificaciones MVP

## ¿Qué es el prode?

Un prode (pronosticador deportivo) es una aplicación donde los usuarios predicen resultados de partidos antes de que empiecen. Ganan puntos según qué tan acertado fue su pronóstico. Esta versión es para el Mundial de fútbol con grupos de amigos o colegas.

---

## Reglas de puntuación (según la captura)

| Situación | Puntos |
|---|---|
| Ganador correcto o empate correcto (sin importar marcador) | 3 puntos |
| Ganador correcto + diferencia de goles exacta | 4 puntos |
| Resultado exacto (score exacto) | 6 puntos |
| En empates: cualquier empate diferente al exacto | 3 puntos |
| Resultado exacto en empate (ej: 1-1 vs 1-1) | 6 puntos |
| En caso de penales: se usa el resultado previo a la tanda | — |
| Límite para pronosticar | 5 minutos antes del partido |

### Lógica de cálculo (Python):

```python
def calcular_puntos(real_local, real_visitante, pred_local, pred_visitante):
    # Resultado exacto
    if pred_local == real_local and pred_visitante == real_visitante:
        return 6
    
    real_diff = real_local - real_visitante
    pred_diff = pred_local - pred_visitante
    
    # Empate
    if real_diff == 0:
        # Cualquier empate distinto = 3 puntos (no se cuenta diferencia)
        if pred_diff == 0:
            return 3
        return 0
    
    # Ganador correcto
    if (real_diff > 0 and pred_diff > 0) or (real_diff < 0 and pred_diff < 0):
        # Diferencia de goles exacta
        if real_diff == pred_diff:
            return 4
        return 3
    
    return 0
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend / API | Python + FastAPI |
| Frontend | Next.js 14+ (App Router) |
| Base de datos | MongoDB (Mongoose o Motor) |
| Auth | NextAuth.js o JWT simple |
| Hosting sugerido | Railway / Render (backend) + Vercel (frontend) |

---

## Estructura de la base de datos (MongoDB)

### Colección: `users`
```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "password_hash": "string",
  "avatar_url": "string | null",
  "created_at": "datetime"
}
```

### Colección: `tournaments`
```json
{
  "_id": "ObjectId",
  "name": "Mundial 2026",
  "slug": "mundial-2026",
  "active": true,
  "created_at": "datetime"
}
```

### Colección: `matches`
```json
{
  "_id": "ObjectId",
  "tournament_id": "ObjectId",
  "phase": "grupos | octavos | cuartos | semifinal | final",
  "group": "A | B | ... | null",
  "home_team": "Argentina",
  "away_team": "Francia",
  "home_flag": "🇦🇷",
  "away_flag": "🇫🇷",
  "kickoff_at": "datetime (UTC)",
  "deadline_at": "datetime (kickoff - 5 min)",
  "status": "upcoming | live | finished",
  "result": {
    "home_score": 2,
    "away_score": 1,
    "went_to_penalties": false
  }
}
```

### Colección: `predictions`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "match_id": "ObjectId",
  "league_id": "ObjectId | null",
  "home_score": 2,
  "away_score": 0,
  "points_earned": null,
  "submitted_at": "datetime"
}
```

### Colección: `leagues` (grupos privados)
```json
{
  "_id": "ObjectId",
  "name": "Liga de la Oficina",
  "code": "ABCD12",
  "owner_id": "ObjectId",
  "members": ["ObjectId", "ObjectId"],
  "tournament_id": "ObjectId",
  "created_at": "datetime"
}
```

---

## API REST — Endpoints FastAPI (MVP)

### Auth
```
POST   /api/auth/register     → Crear usuario
POST   /api/auth/login        → Login, devuelve JWT
GET    /api/auth/me           → Datos del usuario autenticado
```

### Partidos
```
GET    /api/matches                    → Lista todos los partidos
GET    /api/matches/{match_id}        → Detalle de un partido
PUT    /api/matches/{match_id}/result → Cargar resultado (solo admin)
```

### Pronósticos
```
GET    /api/predictions/me            → Mis pronósticos
POST   /api/predictions               → Crear/actualizar pronóstico
       Body: { match_id, home_score, away_score }
GET    /api/predictions/{match_id}    → Pronósticos de todos (post-partido)
```

### Ligas
```
POST   /api/leagues            → Crear liga privada
GET    /api/leagues/{code}     → Unirse con código
GET    /api/leagues/{id}       → Info + tabla de posiciones
GET    /api/leagues/{id}/leaderboard → Tabla detallada
```

### Tabla de posiciones
```
GET    /api/leaderboard/global        → Ranking global del torneo
GET    /api/leaderboard/{league_id}   → Ranking de una liga
```

---

## Estructura del proyecto

```
prode-mundial/
├── backend/                    (FastAPI + Python)
│   ├── main.py
│   ├── database.py             (conexión MongoDB con Motor async)
│   ├── models/
│   │   ├── user.py
│   │   ├── match.py
│   │   ├── prediction.py
│   │   └── league.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── matches.py
│   │   ├── predictions.py
│   │   ├── leagues.py
│   │   └── leaderboard.py
│   ├── services/
│   │   └── scoring.py          (lógica de puntuación)
│   ├── middleware/
│   │   └── auth.py             (JWT verify)
│   └── requirements.txt
│
└── frontend/                   (Next.js 14)
    ├── app/
    │   ├── page.tsx             (home / landing)
    │   ├── partidos/
    │   │   └── page.tsx         (lista de partidos + ingresar pronóstico)
    │   ├── tabla/
    │   │   └── page.tsx         (leaderboard global)
    │   ├── liga/
    │   │   ├── [code]/page.tsx  (unirse con código)
    │   │   └── [id]/page.tsx    (tabla de la liga)
    │   └── cuenta/
    │       └── page.tsx         (perfil + mis pronósticos)
    ├── components/
    │   ├── MatchCard.tsx
    │   ├── PredictionInput.tsx
    │   ├── Leaderboard.tsx
    │   └── ScoreBadge.tsx
    └── lib/
        └── api.ts               (fetch helpers)
```

---

## Pantallas del MVP

### 1. Pantalla de Partidos (`/partidos`)
- Lista de partidos agrupados por fecha/fase
- Cada partido muestra: equipos, fecha, hora, estado
- Si el partido tiene deadline activo → mostrar inputs de pronóstico
- Si ya pronosticó → mostrar su pronóstico (editable hasta deadline)
- Si terminó → mostrar resultado + puntos ganados

### 2. Tabla de posiciones (`/tabla`)
- Ranking de usuarios: puesto, nombre, puntos totales
- Filtro por liga privada
- Indicador de puntos del último partido

### 3. Ligas (`/liga`)
- Crear liga con nombre → recibir código de 6 caracteres
- Unirse con código
- Ver tabla de la liga

### 4. Mi cuenta (`/cuenta`)
- Ver todos mis pronósticos
- Historial de puntos partido a partido

---

## Flujo de usuario principal

```
1. Usuario se registra / logea
2. Entra a /partidos → ve los próximos partidos
3. Hace clic en un partido → ingresa pronóstico (ej: 2-1)
4. El sistema valida que está dentro del deadline
5. Empieza el partido → pronósticos bloqueados
6. Admin carga el resultado final
7. El sistema calcula puntos automáticamente para todos los que pronosticaron
8. Tabla de posiciones se actualiza en tiempo real
```

---

## Lógica de scoring (servicio backend)

```python
# backend/services/scoring.py

from typing import Optional

def calcular_puntos(
    real_local: int,
    real_visitante: int,
    pred_local: int,
    pred_visitante: int
) -> int:
    """
    Devuelve los puntos ganados por un pronóstico dado el resultado real.
    """
    # Resultado exacto → 6 puntos
    if pred_local == real_local and pred_visitante == real_visitante:
        return 6

    real_diff = real_local - real_visitante
    pred_diff = pred_local - pred_visitante

    # Ambos son empate pero no exacto → 3 puntos
    if real_diff == 0 and pred_diff == 0:
        return 3

    # No acertó el ganador
    if real_diff == 0 or pred_diff == 0:
        return 0
    if (real_diff > 0) != (pred_diff > 0):
        return 0

    # Ganador correcto + diferencia exacta → 4 puntos
    if real_diff == pred_diff:
        return 4

    # Ganador correcto → 3 puntos
    return 3


async def calcular_puntos_partido(db, match_id: str):
    """
    Luego de cargar el resultado, recalcula puntos para todos los pronósticos.
    """
    match = await db.matches.find_one({"_id": match_id})
    result = match["result"]
    
    predictions = await db.predictions.find({"match_id": match_id}).to_list(None)
    
    for pred in predictions:
        pts = calcular_puntos(
            result["home_score"],
            result["away_score"],
            pred["home_score"],
            pred["away_score"]
        )
        await db.predictions.update_one(
            {"_id": pred["_id"]},
            {"$set": {"points_earned": pts}}
        )
```

---

## Variables de entorno

### Backend (`.env`)
```env
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/prode
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRY_HOURS=72
ADMIN_EMAIL=admin@tudominio.com

# API-Football
API_FOOTBALL_KEY=tu_api_key_aqui
API_FOOTBALL_BASE=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE=1
API_FOOTBALL_SEASON=2026
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=otro_secreto
NEXTAUTH_URL=http://localhost:3000
```

---

## Checklist MVP — orden de desarrollo

### Semana 1 — Backend base
- [ ] Setup FastAPI + Motor (MongoDB async)
- [ ] Modelos de datos y conexión DB
- [ ] Endpoints de auth (register, login, JWT)
- [ ] CRUD de partidos
- [ ] Endpoint de pronósticos con validación de deadline
- [ ] Servicio de scoring + endpoint para cargar resultados
- [ ] Registrar cuenta en api-sports.io y obtener API key
- [ ] Implementar `football_api.py` (cliente HTTP)
- [ ] Implementar `sync.py` (transformación y upsert a MongoDB)
- [ ] Implementar `scheduler.py` (cron con APScheduler)
- [ ] Sync inicial automático al arrancar si la DB está vacía
- [ ] Endpoint admin `POST /api/matches/sync` para forzar sync manual

### Semana 2 — Frontend base
- [ ] Setup Next.js + TypeScript
- [ ] Auth con JWT (login/register)
- [ ] Pantalla de partidos con inputs de pronóstico
- [ ] Integración con API backend
- [ ] Tabla de posiciones global

### Semana 3 — Ligas y pulido
- [ ] Crear y unirse a ligas privadas
- [ ] Tabla de posiciones por liga
- [ ] Pantalla "Mi cuenta" con historial
- [ ] Bloqueo automático de pronósticos pasado el deadline
- [ ] Panel admin para cargar resultados

### Post-MVP (opcionales)
- [ ] Notificaciones push (recordatorio antes del partido)
- [ ] Compartir resultado por WhatsApp/Instagram
- [ ] Modo espectador (ver pronósticos de todos post-partido)
- [ ] Estadísticas: % de aciertos, racha, mejor partido
- [ ] Chat dentro de la liga

---

## Integración con API-Football (api-sports.io)

### Por qué esta API

API-Football cubre el Mundial 2026 en su plan gratuito con los mismos endpoints que el plan pago, solo limitado a 100 requests/día. Suficiente para desarrollo. Para producción durante el torneo se recomienda el plan €19/mo (75k req/día).

- Registro: https://dashboard.api-football.com/register
- Documentación: https://www.api-football.com/documentation-v3
- Mundial 2026: `league=1`, `season=2026`

---

### Paso 1 — Instalar dependencias

```bash
pip install httpx apscheduler python-dotenv
```

Agregar al `requirements.txt`:
```
httpx==0.27.0
apscheduler==3.10.4
python-dotenv==1.0.1
```

---

### Paso 2 — Variables de entorno

Agregar al `.env` del backend:
```env
API_FOOTBALL_KEY=tu_api_key_aqui
API_FOOTBALL_BASE=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE=1
API_FOOTBALL_SEASON=2026
```

---

### Paso 3 — Cliente HTTP (`backend/services/football_api.py`)

Cliente base con manejo de errores y rate limiting:

```python
# backend/services/football_api.py

import httpx
import os
from typing import Optional

BASE_URL = os.getenv("API_FOOTBALL_BASE", "https://v3.football.api-sports.io")
API_KEY  = os.getenv("API_FOOTBALL_KEY")
LEAGUE   = int(os.getenv("API_FOOTBALL_LEAGUE", 1))
SEASON   = int(os.getenv("API_FOOTBALL_SEASON", 2026))

HEADERS = {
    "x-apisports-key": API_KEY,
    "Accept": "application/json",
}


async def _get(endpoint: str, params: dict = {}) -> dict:
    """Wrapper base — lanza excepción si la API devuelve error."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{BASE_URL}/{endpoint}",
            headers=HEADERS,
            params=params,
        )
        resp.raise_for_status()
        data = resp.json()

        if data.get("errors"):
            raise ValueError(f"API-Football error: {data['errors']}")

        return data.get("response", [])


async def get_fixtures(status: Optional[str] = None) -> list:
    """
    Trae partidos del Mundial.
    status: 'NS' (no iniciados), 'LIVE' (en vivo), 'FT' (terminados), None (todos)
    """
    params = {"league": LEAGUE, "season": SEASON}
    if status:
        params["status"] = status
    return await _get("fixtures", params)


async def get_fixture_by_id(fixture_id: int) -> dict:
    """Detalle completo de un partido por su ID de API-Football."""
    results = await _get("fixtures", {"id": fixture_id})
    return results[0] if results else None


async def get_live_fixtures() -> list:
    """Partidos en este momento con score en tiempo real."""
    return await _get("fixtures", {"league": LEAGUE, "season": SEASON, "live": "all"})


async def get_standings() -> list:
    """Tabla de posiciones de grupos."""
    return await _get("standings", {"league": LEAGUE, "season": SEASON})
```

---

### Paso 4 — Servicio de sincronización (`backend/services/sync.py`)

Transforma la respuesta de API-Football al esquema propio de MongoDB y hace upsert:

```python
# backend/services/sync.py

from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.football_api import get_fixtures, get_live_fixtures
from services.scoring import calcular_puntos_partido


# Mapeo de status de API-Football → status interno
STATUS_MAP = {
    "NS":  "upcoming",   # Not Started
    "1H":  "live",       # Primer tiempo
    "HT":  "live",       # Medio tiempo
    "2H":  "live",       # Segundo tiempo
    "ET":  "live",       # Tiempo extra
    "P":   "live",       # Penales
    "FT":  "finished",   # Full Time
    "AET": "finished",   # After Extra Time
    "PEN": "finished",   # After Penalties
    "PST": "upcoming",   # Postponed
    "CANC":"upcoming",   # Cancelled
}

# Mapeo de ronda API → fase interna
ROUND_MAP = {
    "Group Stage":    "grupos",
    "Round of 32":    "treintaidosavos",
    "Round of 16":    "octavos",
    "Quarter-finals": "cuartos",
    "Semi-finals":    "semifinal",
    "3rd Place Final":"tercer_puesto",
    "Final":          "final",
}


def _parse_fixture(f: dict) -> dict:
    """Convierte un fixture de API-Football al esquema de MongoDB."""
    fixture   = f["fixture"]
    teams     = f["teams"]
    goals     = f["goals"]
    league    = f["league"]

    kickoff   = datetime.fromisoformat(fixture["date"].replace("Z", "+00:00"))
    deadline  = kickoff - timedelta(minutes=5)
    status_raw = fixture["status"]["short"]
    status    = STATUS_MAP.get(status_raw, "upcoming")

    # Detectar penales: status PEN en API-Football
    went_to_penalties = status_raw == "PEN"

    # En penales usar score pre-tanda (score.fulltime)
    scores = f.get("score", {})
    if went_to_penalties:
        home_score = scores.get("fulltime", {}).get("home")
        away_score = scores.get("fulltime", {}).get("away")
    else:
        home_score = goals.get("home")
        away_score = goals.get("away")

    round_raw = league.get("round", "")
    phase = ROUND_MAP.get(round_raw, "grupos")
    group = league.get("round", "").replace("Group Stage - ", "") \
            if "Group Stage" in round_raw else None

    return {
        "external_id":  fixture["id"],         # ID de API-Football para futuros syncs
        "phase":        phase,
        "group":        group,
        "home_team":    teams["home"]["name"],
        "away_team":    teams["away"]["name"],
        "home_logo":    teams["home"]["logo"],
        "away_logo":    teams["away"]["logo"],
        "kickoff_at":   kickoff,
        "deadline_at":  deadline,
        "status":       status,
        "result": {
            "home_score":        home_score,
            "away_score":        away_score,
            "went_to_penalties": went_to_penalties,
        } if status == "finished" else None,
        "synced_at": datetime.now(timezone.utc),
    }


async def sync_all_fixtures(db: AsyncIOMotorDatabase):
    """
    Sincroniza TODOS los partidos del torneo.
    Usar en el arranque inicial o 1 vez por día.
    """
    fixtures = await get_fixtures()
    count = 0

    for f in fixtures:
        doc = _parse_fixture(f)
        await db.matches.update_one(
            {"external_id": doc["external_id"]},
            {"$set": doc},
            upsert=True,
        )
        count += 1

    print(f"[sync] {count} partidos sincronizados")
    return count


async def sync_live_fixtures(db: AsyncIOMotorDatabase):
    """
    Sincroniza solo los partidos en vivo.
    Ejecutar cada 30–60 segundos durante el torneo.
    """
    fixtures = await get_live_fixtures()

    if not fixtures:
        return 0

    for f in fixtures:
        doc = _parse_fixture(f)
        prev = await db.matches.find_one({"external_id": doc["external_id"]})

        await db.matches.update_one(
            {"external_id": doc["external_id"]},
            {"$set": doc},
            upsert=True,
        )

        # Si el partido acaba de terminar → calcular puntos automáticamente
        if prev and prev.get("status") != "finished" and doc["status"] == "finished":
            match = await db.matches.find_one({"external_id": doc["external_id"]})
            await calcular_puntos_partido(db, match["_id"])
            print(f"[sync] Puntos calculados para partido {match['_id']}")

    return len(fixtures)
```

---

### Paso 5 — Scheduler de cron (`backend/scheduler.py`)

Ejecuta las sincronizaciones en background sin bloquear FastAPI:

```python
# backend/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from database import get_db
from services.sync import sync_all_fixtures, sync_live_fixtures
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def job_sync_live():
    """Corre cada 60 segundos — solo durante el torneo."""
    try:
        db = await get_db()
        updated = await sync_live_fixtures(db)
        if updated:
            logger.info(f"[cron] {updated} partidos en vivo actualizados")
    except Exception as e:
        logger.error(f"[cron] Error sync live: {e}")


async def job_sync_all():
    """Corre 1 vez por día a las 04:00 UTC para refrescar el fixture completo."""
    try:
        db = await get_db()
        count = await sync_all_fixtures(db)
        logger.info(f"[cron] Sync diario: {count} partidos")
    except Exception as e:
        logger.error(f"[cron] Error sync diario: {e}")


def start_scheduler():
    # Sync en vivo cada 60 segundos
    scheduler.add_job(
        job_sync_live,
        trigger=IntervalTrigger(seconds=60),
        id="sync_live",
        replace_existing=True,
    )
    # Sync completo todos los días a las 04:00 UTC
    scheduler.add_job(
        job_sync_all,
        trigger=CronTrigger(hour=4, minute=0),
        id="sync_daily",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[scheduler] Iniciado")
```

---

### Paso 6 — Arrancar el scheduler con FastAPI (`backend/main.py`)

```python
# backend/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import connect_db, close_db
from scheduler import start_scheduler, scheduler
from services.sync import sync_all_fixtures
from database import get_db

# Routers
from routers import auth, matches, predictions, leagues, leaderboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    db = await get_db()

    # Sincronización inicial al arrancar (solo si la colección está vacía)
    count = await db.matches.count_documents({})
    if count == 0:
        print("[startup] DB vacía — sincronizando fixture completo...")
        await sync_all_fixtures(db)

    start_scheduler()
    yield

    # Shutdown
    scheduler.shutdown()
    await close_db()


app = FastAPI(title="Prode Mundial API", lifespan=lifespan)

app.include_router(auth.router,        prefix="/api/auth")
app.include_router(matches.router,     prefix="/api/matches")
app.include_router(predictions.router, prefix="/api/predictions")
app.include_router(leagues.router,     prefix="/api/leagues")
app.include_router(leaderboard.router, prefix="/api/leaderboard")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

### Paso 7 — Endpoint de sync manual (admin)

Para forzar una sincronización sin esperar el cron:

```python
# Agregar en backend/routers/matches.py

from fastapi import APIRouter, Depends
from database import get_db
from services.sync import sync_all_fixtures, sync_live_fixtures
from middleware.auth import require_admin   # tu decorator de admin

router = APIRouter()

@router.post("/sync", dependencies=[Depends(require_admin)])
async def force_sync(db=Depends(get_db)):
    """Fuerza sincronización completa. Solo admin."""
    count = await sync_all_fixtures(db)
    return {"synced": count}

@router.post("/sync/live", dependencies=[Depends(require_admin)])
async def force_sync_live(db=Depends(get_db)):
    """Fuerza sincronización de partidos en vivo."""
    count = await sync_live_fixtures(db)
    return {"synced": count}
```

---

### Estructura final con los nuevos archivos

```
backend/
├── main.py                         ← lifespan + routers
├── scheduler.py                    ← APScheduler cron jobs  ← NUEVO
├── database.py
├── services/
│   ├── football_api.py             ← cliente HTTP API-Football  ← NUEVO
│   ├── sync.py                     ← transforma y sincroniza a MongoDB  ← NUEVO
│   └── scoring.py
└── ...
```

---

### Frecuencia de sincronización recomendada

| Situación | Frecuencia | Job |
|---|---|---|
| No hay partidos hoy | 1 vez/día (04:00 UTC) | `sync_daily` |
| Hay partido en las próximas 2hs | 1 vez/hora | Podés agregar un job extra |
| Partido en vivo | Cada 60 segundos | `sync_live` |
| Partido recién terminado | 1 vez automático al detectar `FT` | `sync_live` + trigger de scoring |

Con 100 req/día del plan gratuito: el sync diario usa 1 request, el sync en vivo usa 1 request cada 60 segundos solo cuando hay partidos en juego (máximo ~6 horas por partido = 360 requests ese día). **Para días con partido necesitás el plan pago.**

### Estrategia para no pasarse del límite gratuito

```python
# En job_sync_live, verificar primero si hay partidos hoy
# antes de gastar un request en live

async def job_sync_live():
    db = await get_db()
    # Chequear en nuestra propia DB si hay partidos en las próximas 2hs
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    upcoming_soon = await db.matches.count_documents({
        "kickoff_at": {"$gte": now, "$lte": now + timedelta(hours=2)},
        "status": {"$in": ["upcoming", "live"]}
    })
    if upcoming_soon == 0:
        return   # No hay partidos próximos → no gastar request
    await sync_live_fixtures(db)
```

---

## Notas importantes

**Deadlines:** Usar siempre UTC en la DB. Mostrar en hora local del usuario en el frontend con `Intl.DateTimeFormat`.

**Penales:** Al cargar un resultado, el admin indica si hubo penales. Si hubo, carga el score previo a la tanda (ej: 1-1 en 90'+ET) y ese es el que se usa para el scoring.

**Idempotencia de pronósticos:** `POST /api/predictions` con `upsert: true` — si ya existe un pronóstico para ese usuario+partido, lo reemplaza (siempre que esté dentro del deadline).

**Índices MongoDB recomendados:**
```js
db.predictions.createIndex({ user_id: 1, match_id: 1 }, { unique: true })
db.predictions.createIndex({ match_id: 1 })
db.matches.createIndex({ kickoff_at: 1 })
db.leagues.createIndex({ code: 1 }, { unique: true })
```
