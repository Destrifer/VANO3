#!/usr/bin/env bash
# Обновить directus/snapshot.yaml с ПРОДА (источник истины схемы — прод).
# Запускать ПОСЛЕ ЛЮБОЙ правки схемы в admin.printmos.ru, затем закоммитить:
# деплой применяет снапшот из гита (`schema apply` в deploy.yml), и устаревший
# снапшот ОТКАТИТ прод-схему (apply удаляет то, чего нет в снапшоте).
#
# Токен: env DIRECTUS_PROD_TOKEN, иначе DIRECTUS_ADMIN_TOKEN из .env
# (работает, пока прод-админ не перевыпустил токен — после хардненинга
# положить прод-токен в DIRECTUS_PROD_TOKEN).
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${DIRECTUS_PROD_URL:-https://admin.printmos.ru}"
TOKEN="${DIRECTUS_PROD_TOKEN:-$(grep '^DIRECTUS_ADMIN_TOKEN=' .env | cut -d= -f2-)}"

curl -sfg -H "Authorization: Bearer $TOKEN" \
  "$URL/schema/snapshot?export=yaml" -o directus/snapshot.yaml

echo "OK: directus/snapshot.yaml обновлён с $URL."
echo "Проверь git diff directus/snapshot.yaml и закоммить."
