#!/usr/bin/env bash
TARGET="$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")"
DIR="$(cd "$(dirname "$TARGET")" && pwd)"
"$DIR/dvr" "${1:-start}"


