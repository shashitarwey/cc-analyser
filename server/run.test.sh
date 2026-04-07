#!/bin/bash
# Run server tests
# Usage: ./run.test.sh

set -e

cd "$(dirname "$0")"

echo "=== Server Tests ==="
npm test
