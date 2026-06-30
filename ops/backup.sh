#!/usr/bin/env bash
# Бэкап printmos: дамп БД Directus (.sql.gz) + аплоады (.tar.gz). Ротация по количеству.
# На сервере лежит в /opt/printmos/backup.sh (симлинк pmos-backup), запускается cron 03:30
# и вручную перед рискованными правками:  pmos-backup before-edit
set -euo pipefail
PROJ=/opt/printmos
LABEL="${1:-auto}"
TS=$(date +%Y%m%d-%H%M%S)
DIR="$PROJ/backups"; mkdir -p "$DIR/db" "$DIR/uploads"
C="docker compose -p printmos -f $PROJ/docker-compose.prod.yml --env-file $PROJ/.env.production"
DB="$DIR/db/db-$TS-$LABEL.sql.gz"
UP="$DIR/uploads/uploads-$TS-$LABEL.tar.gz"
$C exec -T database pg_dump -U directus -d directus --clean --if-exists --no-owner --no-acl | gzip -9 > "$DB"
$C exec -T directus sh -c 'cd /directus/uploads && tar -czf - .' > "$UP"
# ротация: последние 30 дампов БД и 14 архивов аплоадов
ls -1t "$DIR/db"/*.sql.gz   2>/dev/null | tail -n +31 | xargs -r rm -f
ls -1t "$DIR/uploads"/*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "$(date '+%F %T') backup OK [$LABEL]: db=$(du -h "$DB" | cut -f1)  uploads=$(du -h "$UP" | cut -f1)"
