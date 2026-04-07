#!/bin/bash
# Run client tests
# Usage: ./run.test.sh

set -e

cd "$(dirname "$0")"

echo "=== Client Tests ==="
npm test
