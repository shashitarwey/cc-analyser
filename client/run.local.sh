#!/bin/bash
# Start client for local development
# Usage: ./run.local.sh

set -e

cd "$(dirname "$0")"

echo "=== Starting client (port 3000) ==="
npm run dev
