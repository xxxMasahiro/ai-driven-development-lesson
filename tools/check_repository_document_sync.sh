#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$ROOT/tools/check_repository_document_sync.mjs" --repo "$ROOT" --validate-policy
