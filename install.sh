#!/usr/bin/env bash
TARGET="$(readlink -f "$0" 2>/dev/null || realpath "$0" 2>/dev/null || echo "$0")"
DIR="$(cd "$(dirname "$TARGET")" && pwd)"
cd "$DIR"




USER_MODE=false
for arg in "$@"; do
    if [ "$arg" = "--user" ]; then
        USER_MODE=true
    fi
done

echo "=================================================================="
echo "  🚀 Installing Security Operations Video Wall on Ubuntu Server"
echo "=================================================================="

# Check OS
if [ "$(uname -s)" != "Linux" ]; then
    echo "[!] Error: This installer is intended for Linux / Ubuntu Server."
    exit 1
fi

# Detect architecture
ARCH="$(uname -m)"
echo "[*] Detected CPU Architecture: $ARCH"

case "$ARCH" in
    x86_64|amd64)
        GO2RTC_BINARY="go2rtc_linux_amd64"
        ;;
    aarch64|arm64)
        GO2RTC_BINARY="go2rtc_linux_arm64"
        ;;
    armv7l|armhf)
        GO2RTC_BINARY="go2rtc_linux_arm"
        ;;
    *)
        echo "[!] Unsupported architecture: $ARCH. Using amd64 default."
        GO2RTC_BINARY="go2rtc_linux_amd64"
        ;;
esac

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[*] Python3 not found. Installing python3..."
    sudo apt-get update && sudo apt-get install -y python3
fi

# Check curl / wget
if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
    echo "[*] Installing curl..."
    sudo apt-get update && sudo apt-get install -y curl
fi

# Check / Download go2rtc
if [ ! -f "$DIR/go2rtc" ] || [ ! -x "$DIR/go2rtc" ]; then
    echo "[*] Downloading go2rtc ($GO2RTC_BINARY)..."
    GO2RTC_URL="https://github.com/AlexxIT/go2rtc/releases/latest/download/$GO2RTC_BINARY"
    if command -v curl &> /dev/null; then
        curl -L -o "$DIR/go2rtc" "$GO2RTC_URL"
    else
        wget -O "$DIR/go2rtc" "$GO2RTC_URL"
    fi
    chmod +x "$DIR/go2rtc"
    echo "[✓] Downloaded and made executable: $DIR/go2rtc"
else
    chmod +x "$DIR/go2rtc"
    echo "[✓] Found existing go2rtc binary."
fi

# Make scripts executable
chmod +x "$DIR/run.py" "$DIR/gen_config.py" "$DIR/dvr" "$DIR/start.sh" "$DIR/stop.sh" 2>/dev/null || true

# Initialize configuration
if [ ! -f "$DIR/config.json" ]; then
    if [ -f "$DIR/config.example.json" ]; then
        echo "[*] Initializing config.json from template..."
        cp "$DIR/config.example.json" "$DIR/config.json"
    fi
fi

# Build config & streams
echo "[*] Compiling stream and wall configuration..."
python3 "$DIR/gen_config.py"

# Stop any running instances before service setup
python3 "$DIR/run.py" stop >/dev/null 2>&1 || true

CURRENT_USER="$(id -un)"

if [ "$USER_MODE" = true ]; then
    # User-level systemd service (No sudo required)
    USER_SYSTEMD_DIR="$HOME/.config/systemd/user"
    mkdir -p "$USER_SYSTEMD_DIR"
    SERVICE_FILE="$USER_SYSTEMD_DIR/dvr-wall.service"

    echo "[*] Configuring user systemd service at $SERVICE_FILE..."
    cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Security Operations Video Wall & RTSP Media Stream Engine
After=default.target

[Service]
Type=simple
WorkingDirectory=$DIR
ExecStart=/usr/bin/python3 $DIR/run.py run
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5s
KillMode=mixed
TimeoutStopSec=10s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=dvr-wall

[Install]
WantedBy=default.target
EOF

    echo "[*] Reloading user systemd daemon and enabling service..."
    systemctl --user daemon-reload
    systemctl --user enable dvr-wall.service
    systemctl --user restart dvr-wall.service
    echo "[✓] User systemd service installed and started."

    # Setup local bin symlink
    mkdir -p "$HOME/.local/bin"
    ln -sf "$DIR/dvr" "$HOME/.local/bin/dvr"
    echo "[✓] Installed 'dvr' command to $HOME/.local/bin/dvr"

else
    # System-level systemd service (requires sudo)
    SERVICE_FILE="/etc/systemd/system/dvr-wall.service"
    echo "[*] Configuring system-wide systemd service at $SERVICE_FILE..."
    sudo bash -c "cat <<EOF > $SERVICE_FILE
[Unit]
Description=Security Operations Video Wall & RTSP Media Stream Engine
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$DIR
ExecStart=/usr/bin/python3 $DIR/run.py run
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5s
KillMode=mixed
TimeoutStopSec=10s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=dvr-wall

NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$DIR

[Install]
WantedBy=multi-user.target
EOF"

    echo "[*] Reloading systemd daemon and enabling service..."
    sudo systemctl daemon-reload
    sudo systemctl enable dvr-wall.service
    sudo systemctl restart dvr-wall.service

    # Setup CLI Symlink
    if [ -f "$DIR/dvr" ]; then
        sudo ln -sf "$DIR/dvr" /usr/local/bin/dvr
        echo "[✓] Installed 'dvr' command to /usr/local/bin/dvr"
    fi

    # Setup optional firewall rules
    if command -v ufw &> /dev/null && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
        echo "[*] UFW firewall active. Allowing necessary ports..."
        sudo ufw allow 8085/tcp comment "DVR Video Wall UI" >/dev/null 2>&1 || true
        sudo ufw allow 1984/tcp comment "go2rtc API / Signaling" >/dev/null 2>&1 || true
        sudo ufw allow 8555/tcp comment "go2rtc WebRTC TCP" >/dev/null 2>&1 || true
        sudo ufw allow 8555/udp comment "go2rtc WebRTC UDP" >/dev/null 2>&1 || true
        sudo ufw allow 8560/tcp comment "go2rtc RTSP internal" >/dev/null 2>&1 || true
        echo "[✓] UFW firewall ports opened (8085, 1984, 8555 TCP/UDP)."
    fi
fi

sleep 2

echo "=================================================================="
echo "  🎉 INSTALLATION COMPLETE & SERVICE STARTED!"
echo "=================================================================="
python3 "$DIR/run.py" status
echo ""
echo "Management Cheat Sheet:"
echo "  • Status         : dvr status   (or systemctl status dvr-wall)"
echo "  • Live Logs      : dvr logs     (or journalctl -u dvr-wall -f)"
echo "  • Restart Service: dvr restart  (or systemctl restart dvr-wall)"
echo "  • Edit Config    : dvr edit     (edits config.json & auto-reloads)"
echo "  • Discover Cams  : dvr discover (scans DVRs for updated channel names)"
echo "  • Health Check   : dvr health   (validates stream & web availability)"
echo "=================================================================="
