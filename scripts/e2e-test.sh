#!/usr/bin/env bash
# Prueba end-to-end contra el dev server (PORT 3100) con datos reales del Mundial 2026.
set -e
BASE="http://localhost:3100/api"
ADMIN_JAR=/tmp/prode-admin.cookies
USER_JAR=/tmp/prode-user.cookies
rm -f "$ADMIN_JAR" "$USER_JAR"

say() { printf "\n\033[1;32m== %s ==\033[0m\n" "$1"; }

say "1) Registrar admin (rrodi@tedepsa.com)"
curl -s -c "$ADMIN_JAR" -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"Admin","email":"rrodi@tedepsa.com","password":"admin123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  admin:', d.get('user',{}).get('username'), '| is_admin:', d.get('user',{}).get('is_admin'), d.get('error',''))"

say "2) Sync del fixture real (football-data.org)"
curl -s -b "$ADMIN_JAR" -X POST "$BASE/matches/sync" \
  -H 'Content-Type: application/json' -d '{"mode":"all"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  partidos sincronizados:', d.get('synced', d.get('error')))"

say "3) Listar primeros partidos"
curl -s -b "$ADMIN_JAR" "$BASE/matches" | python3 -c "
import sys,json
d=json.load(sys.stdin); ms=d['matches']
print('  total:', len(ms))
for m in ms[:3]:
    print(f\"   [{m['status']}] {m['phase']} {m['group'] or ''}: {m['home_team']} vs {m['away_team']}  predecible={m['can_predict']}\")
# guardar el id del primer partido predecible
pred=[m for m in ms if m['can_predict']]
open('/tmp/prode_match.txt','w').write(pred[0]['id'] if pred else '')
print('  partidos predecibles:', len(pred))
"
MATCH_ID=$(cat /tmp/prode_match.txt)
echo "  match de prueba: $MATCH_ID"

say "4) Registrar usuario normal 'Rodri' y pronosticar 2-1"
curl -s -c "$USER_JAR" -X POST "$BASE/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"Rodri","email":"rodri@test.com","password":"rodri123"}' >/dev/null
curl -s -b "$USER_JAR" -X POST "$BASE/predictions" \
  -H 'Content-Type: application/json' \
  -d "{\"match_id\":\"$MATCH_ID\",\"home_score\":2,\"away_score\":1}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  pronóstico:', d.get('home_score'), '-', d.get('away_score'), d.get('error',''))"

say "5) Admin carga resultado REAL 2-1 (debería dar 6 pts: exacto)"
curl -s -b "$ADMIN_JAR" -X PUT "$BASE/matches/$MATCH_ID/result" \
  -H 'Content-Type: application/json' \
  -d '{"home_score":2,"away_score":1,"went_to_penalties":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  resultado cargado, pronósticos puntuados:', d.get('predictions_scored', d.get('error')))"

say "6) Ver puntos del usuario"
curl -s -b "$USER_JAR" "$BASE/predictions/me" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('  total puntos:', d['total_points'])
for p in d['predictions']:
    print(f\"   {p['home_team']} vs {p['away_team']}: pronóstico {p['home_score']}-{p['away_score']} → {p['points_earned']} pts\")
"

say "7) Tabla global"
curl -s -b "$USER_JAR" "$BASE/leaderboard/global" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for i,r in enumerate(d['leaderboard'],1):
    print(f\"   {i}. {r['username']}: {r['total_points']} pts ({r['predictions_count']} PJ)\")
"

echo
echo -e "\033[1;32m✅ E2E completo\033[0m"
