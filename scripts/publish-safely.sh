#!/usr/bin/env bash
set -euo pipefail
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
for attempt in 1 2 3 4 5 6; do
  git fetch origin main
  git reset --hard origin/main
  node scripts/publish-approved.mjs
  node scripts/check-publication.mjs
  git add -A -- articles.json
  if [ -d articles ]; then git add -A -- articles; fi
  if git diff --cached --quiet; then echo 'Published content already matches main'; exit 0; fi
  git commit -m 'Publish reviewed tutorials'
  if git push origin HEAD:main; then echo "Reviewed pages saved (attempt $attempt)"; exit 0; fi
  echo "main changed during publication; rebuilding on latest version ($attempt/6)"
  sleep "$((2*attempt))"
done
echo 'Unable to save approved publication; no force push attempted' >&2
exit 1
