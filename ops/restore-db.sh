#!/usr/bin/env bash
# Откат БД Directus из бэкапа. ОСТОРОЖНО: перезаписывает текущую прод-базу.
# На сервере: /opt/printmos/restore-db.sh (симлинк pmos-restore).
# Использование:  pmos-restore                  — покажет список, выберешь номер
#                 pmos-restore <файл.sql.gz>    — конкретный файл
set -euo pipefail
PROJ=/opt/printmos
C="docker compose -p printmos -f $PROJ/docker-compose.prod.yml --env-file $PROJ/.env.production"
DIR="$PROJ/backups/db"
F="${1:-}"
if [ -z "$F" ]; then
  echo "Бэкапы БД (новые сверху):"; ls -1t "$DIR"/*.sql.gz | head -15 | nl
  read -rp "Номер для восстановления: " N
  F=$(ls -1t "$DIR"/*.sql.gz | sed -n "${N}p")
fi
[ -f "$F" ] || { echo "файл не найден: $F"; exit 1; }
echo ">>> Откат БД из: $F"
echo ">>> Текущая прод-база будет ПЕРЕЗАПИСАНА. Enter — продолжить, Ctrl-C — отмена."; read -r _
echo "[1/4] страховочный бэкап текущего состояния..."; "$PROJ/backup.sh" pre-restore
echo "[2/4] останавливаю app (downtime ~30с)..."; $C stop astro directus
echo "[3/4] восстанавливаю..."; gunzip -c "$F" | $C exec -T database psql -U directus -d directus -q
echo "[4/4] запускаю app..."; $C up -d directus astro
echo "ГОТОВО. База откатена. Чтобы статика сайта отразила откат — внеси любую правку в админке (или Run workflow)."
