#!/usr/bin/env bash
# Деплой прод-сайта одной командой.
#
# Сайт статический: собирается в CI и читает Directus В МОМЕНТ СБОРКИ. Поэтому:
#  • Изменения КОДА  → нужен коммит + push (push сам запускает деплой).
#  • Изменения в DIRECTUS (лого, цены, тексты) → git их НЕ возит; нужна ПЕРЕСБОРКА.
#
# Логика:
#  - Есть staged-изменения (git add ...)  → коммит + push → деплой автоматически.
#  - Иначе (правили только Directus)       → триггер пересборки (repository_dispatch).
#
# Использование:
#   git add <файлы> && bash ops/deploy.sh "feat: сообщение"   # деплой кода
#   bash ops/deploy.sh                                        # пересборка контента
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-chore: manual deploy}"

if ! git diff --cached --quiet; then
  echo "→ Есть staged-изменения кода: коммичу и пушу…"
  git commit -m "$MSG"
  git push origin master
  echo "✓ Запушено в master — деплой запущен автоматически (GitHub Actions «Build & Deploy»)."
  exit 0
fi

echo "→ Staged-изменений кода нет. Пересобираю сайт с актуальным контентом Directus…"
TOKEN="${GITHUB_DEPLOY_TOKEN:-$(grep -E '^GITHUB_DEPLOY_TOKEN=' .env 2>/dev/null | cut -d= -f2- | tr -d '\r"' || true)}"
if [ -z "${TOKEN:-}" ]; then
  cat <<'HELP'
Нет токена для запуска пересборки. Два пути:

  1) Без установки (проще всего):
     GitHub → репозиторий → вкладка Actions → слева «Build & Deploy»
     → кнопка «Run workflow» → Run. Сборка возьмёт свежий контент из Directus.

  2) Одной командой из терминала:
     — создай GitHub Personal Access Token (fine-grained: доступ к репо
       Destrifer/VANO3, права Contents + Actions: Read and write);
     — добавь в .env строку:  GITHUB_DEPLOY_TOKEN=github_pat_xxx
     — снова запусти:  bash ops/deploy.sh
HELP
  exit 1
fi

curl -sf -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/Destrifer/VANO3/dispatches \
  -d '{"event_type":"deploy-site"}'
echo "✓ Пересборка запущена (repository_dispatch: deploy-site). Прогресс — GitHub → Actions."
