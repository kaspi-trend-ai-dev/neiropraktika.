#!/usr/bin/env bash
set -euo pipefail
if (( $# < 2 )); then echo 'Usage: push-report-safely.sh message reports/files...' >&2; exit 2; fi
message=$1; shift
files=("$@")
snapshot=$(mktemp -d)
trap 'rm -rf "$snapshot"' EXIT
for path in "${files[@]}"; do
  case "$path" in reports/*) ;; *) echo "Only report paths permitted: $path" >&2; exit 2;; esac
  if [[ "$path" == *..* || ! -f "$path" ]]; then echo "Missing/unsafe report: $path" >&2; exit 2; fi
  mkdir -p "$snapshot/$(dirname "$path")"
  cp -- "$path" "$snapshot/$path"
done
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
for attempt in 1 2 3 4 5 6; do
  git fetch origin main
  git reset --hard origin/main
  for path in "${files[@]}"; do
    mkdir -p "$(dirname "$path")"
    cp -- "$snapshot/$path" "$path"
  done
  git add -- "${files[@]}"
  if git diff --cached --quiet; then echo 'Report already matches latest main'; exit 0; fi
  git commit -m "$message"
  if git push origin HEAD:main; then echo "Report saved safely (attempt $attempt)"; exit 0; fi
  echo "main moved concurrently; retrying ($attempt/6)"
  sleep "$((attempt * 2))"
done
echo 'Report push failed after six retries; download the Actions artifact' >&2
exit 1
