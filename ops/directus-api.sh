#!/usr/bin/env bash
# Узкая дверь для правок ПРОД-Directus из Claude Code.
#
# Зачем: слой разрешений блокирует произвольные мутирующие curl-запросы на
# внешние хосты (и правильно делает). Вместо того чтобы разрешать «любой curl»,
# разрешается ровно этот скрипт: домен захардкожен, токен не светится в
# аргументах, каждый вызов видно в истории команд.
#
# Разрешение в .claude/settings.json:
#   "permissions": { "allow": ["Bash(bash ops/directus-api.sh:*)"] }
#
# Использование:
#   bash ops/directus-api.sh GET    /fields/bindings
#   bash ops/directus-api.sh PATCH  /fields/bindings/image '{"meta":{...}}'
#   bash ops/directus-api.sh DELETE /fields/bindings/image
#
# Токен: DIRECTUS_PROD_TOKEN, иначе DIRECTUS_ADMIN_TOKEN из .env (как в
# ops/schema-snapshot.sh).
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${DIRECTUS_PROD_URL:-https://admin.printmos.ru}"
TOKEN="${DIRECTUS_PROD_TOKEN:-$(grep '^DIRECTUS_ADMIN_TOKEN=' .env | cut -d= -f2-)}"

METHOD="${1:?нужен метод: GET|POST|PATCH|DELETE}"
ENDPOINT="${2:?нужен путь, например /fields/bindings}"
BODY="${3:-}"

case "$ENDPOINT" in
  /*) ;;
  *) echo "путь должен начинаться со слэша: $ENDPOINT" >&2; exit 1 ;;
esac

# Тело только для методов, которые его принимают; --fail-with-body, чтобы
# ошибку Directus было видно целиком, а не только по коду возврата.
if [ -n "$BODY" ]; then
  curl -sS --fail-with-body -X "$METHOD" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY" \
    "$URL$ENDPOINT" -w "\nHTTP %{http_code}\n"
else
  curl -sS --fail-with-body -X "$METHOD" \
    -H "Authorization: Bearer $TOKEN" \
    "$URL$ENDPOINT" -w "\nHTTP %{http_code}\n"
fi
