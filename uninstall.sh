#!/usr/bin/env bash
# ==============================================================================
# Security Operations Video Wall - Uninstaller Script
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="/etc/systemd/system/dvr-wall.service"

echo "=================================================================="
echo "  🗑️  Uninstalling DVR Video Wall Service"
echo "=================================================================="

# Stop systemd service
if systemctl list-unit-files | grep -q "dvr-wall.service"; then
    echo "[*] Stopping and disabling systemd service..."
    sudo systemctl stop dvr-wall.service || true
    sudo systemctl disable dvr-wall.service || true
fi

# Remove unit file
if [ -f "$SERVICE_FILE" ]; then
    echo "[*] Removing $SERVICE_FILE..."
    sudo rm -f "$SERVICE_FILE"
    sudo systemctl daemon-reload
fi

# Stop any local daemon processes
python3 "$DIR/run.py" stop >/dev/null 2>&1 || true

# Remove CLI symlink
if [ -L "/usr/local/bin/dvr" ]; then
    echo "[*] Removing /usr/local/bin/dvr symlink..."
    sudo rm -f /usr/local/bin/dvr
fi

echo "[✓] DVR Video Wall service has been completely uninstalled."
echo "    Your configuration files in $DIR have been preserved."
echo "=================================================================="
