#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

ACTION="${1:-start}"

if [ "$ACTION" = "logs" ]; then
    echo "Showing recent logs (Ctrl+C to exit)..."
    tail -f "$DIR/go2rtc.log" "$DIR/wall-server.log"
else
    python3 "$DIR/run.py" "$ACTION"
fi

