#!/usr/bin/env bash
# Teste les migrations Supabase sur un Postgres local jetable (bac à sable de Claude ou machine avec Postgres 15+).
# Usage : bash scripts/test-sql.sh   → crée une base « jdr_test », exécute supabase/migrations/*.sql dans l'ordre puis tests/sql/test_*.sql.
#         bash scripts/test-sql.sh complet → même chose avec le fichier unique supabase/installation_complete.sql.
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=${PG_BIN:-/usr/lib/postgresql/16/bin}
DIR=${PG_DIR:-/var/tmp/pgjdr}
PORT=${PG_PORT:-5499}
if ! pg_isready -h "$DIR" -p "$PORT" >/dev/null 2>&1; then
  rm -rf "$DIR" && mkdir -p "$DIR" && chown postgres "$DIR"
  su postgres -c "$BIN/initdb -D $DIR/data -A trust >/dev/null && $BIN/pg_ctl -D $DIR/data -o '-k $DIR -p $PORT -c listen_addresses=' -l $DIR/log start >/dev/null"
  sleep 2
fi
P="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists jdr_test" -c "create database jdr_test" 2>/dev/null
$P -d jdr_test -f tests/sql/00_shim_supabase.sql 2>/dev/null
if [ "${1:-}" = "complet" ]; then
  # Installation neuve en un seul fichier (supabase/installation_complete.sql)
  $P -d jdr_test -f supabase/installation_complete.sql >/dev/null 2>&1 || { echo "ÉCHEC installation complète"; $P -d jdr_test -f supabase/installation_complete.sql; exit 1; }
else
  for f in supabase/migrations/*.sql; do $P -d jdr_test -f "$f" >/dev/null 2>&1 || { echo "ÉCHEC migration $f"; $P -d jdr_test -f "$f"; exit 1; }; done
fi
for t in tests/sql/test_*.sql; do $P -d jdr_test -f "$t" 2>&1 | grep -E "NOTICE|ERROR" ; done
