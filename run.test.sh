#!/bin/bash
# Run tests for both server and client
# Usage: ./run.test.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Server Tests ==="
(cd "$ROOT_DIR/server" && npm test)

echo ""
echo "=== Client Tests ==="
(cd "$ROOT_DIR/client" && npm test)

echo ""
echo "=== All tests passed ==="
