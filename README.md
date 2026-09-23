# Security Operations Video Wall (DVR / NVR Aggregator)

An enterprise-ready, low-latency browser video wall aggregating standard **RTSP** camera feeds from multiple recorders (Dahua, Hikvision, Uniview, generic ONVIF) using [go2rtc](https://github.com/AlexxIT/go2rtc) and WebRTC streaming.

Designed to run as a native service on **Ubuntu Server (20.04 / 22.04 / 24.04 LTS)** or in Docker.

```
 DVR .20 (Dahua 16ch)   ──┐
 DVR .40 (Dahua 16ch)   ──┤
 DVR .90 (Dahua 16ch)   ──┼─ RTSP ─▶ go2rtc (:1984/:8555) ─▶ WebRTC ─▶ Video Wall UI (:8085/)
 DVR .95 (Dahua 16ch)   ──┤
 Cam .205/.206/.217 ──────┘
```

---

## 🚀 Quick Start for Ubuntu Server

### 1-Command Automated Installation

Run the installer on your Ubuntu server:

```bash
# System-wide installation (with sudo)
sudo ./install.sh

# Or non-root user mode (no sudo needed)
./install.sh --user
```

**What the installer does automatically:**
- Detects system CPU architecture (`x86_64` / `ARM64`) and configures `go2rtc`.
- Installs dependencies (`python3`, `curl`).
- Generates `go2rtc.yaml` and `cameras.js` from `config.json`.
- Configures and enables the **systemd service (`dvr-wall.service`)** to start on boot and auto-restart on crashes.
- Installs the system-wide **`dvr` management CLI** into `/usr/local/bin/dvr`.
- Configures UFW firewall rules for all required media ports.

---

## 🛠️ Management CLI (`dvr`)

Once installed, manage the video wall system with the `dvr` command:

| Command | Action |
|---|---|
| `dvr status` | View running status, systemd state, PIDs, and active URLs |
| `dvr logs` | Stream live server logs in real-time (`journalctl`) |
| `dvr restart` | Re-compile configurations and restart services |
| `dvr stop` | Stop all video wall background services |
| `dvr start` | Start the background service |
| `dvr health` | Run instant health diagnostics on web & stream engines |
| `dvr edit` | Open `config.json` in your editor and auto-reload changes |
| `dvr discover` | Scan LAN DVRs to automatically fetch camera channel names |
| `dvr firewall` | View or apply recommended UFW firewall rules |

---

## 🌐 Accessing the Video Wall

Open any web browser on the same network:

- **16-Camera Video Wall**: `http://<SERVER_IP>:8085/`
- **go2rtc Stream Console**: `http://<SERVER_IP>:1984/`
- **Health Diagnostic**: `http://<SERVER_IP>:8085/health`

### 🎮 Interface Features:
- **Interactive 16-Camera Grid**: Low-latency WebRTC streams with MSE fallback.
- **Drag & Drop**: Reorder or swap camera tiles directly in the browser; layouts persist in local storage.
- **Slide Carousel**: Switch between pages of 16 cameras (e.g. 1–16, 17–32, etc.) using `◀` / `▶` buttons or keyboard arrow keys.
- **Solo HD View**: Double-click or click `⤢` on any camera tile to open its high-resolution main stream.
- **Channel Reassignment**: Hover on any tile and click `⚙` to reassign or rename channels.

---

## ⚙️ Configuration & Adding Cameras

The primary configuration file is [`config.json`](config.json):

```json
{
  "server": {
    "web_port": 8085,
    "api_port": 1984,
    "webrtc_port": 8555,
    "rtsp_port": 8560,
    "transcode": false,
    "hwaccel": "vaapi"
  },
  "auth": {
    "default_user": "admin",
    "default_password": "YOUR_PASSWORD"
  },
  "dvrs": [
    {
      "name": "dvr20",
      "title": "DVR .20 (Dahua)",
      "ip": "192.168.2.20",
      "brand": "dahua",
      "https": true,
      "channels": [
        {"channel": 1, "name": "Gate 1"},
        {"channel": 2, "name": "Parking"}
      ]
    }
  ]
}
```

### Applying Changes:
```bash
# Option 1: Edit interactively
dvr edit

# Option 2: Edit file directly, then recompile & restart
nano config.json
dvr restart
```

### Auto-Discover Camera Names from DVRs:
If your DVRs support Dahua CGI or Hikvision ISAPI, automatically pull all channel labels:
```bash
dvr discover
```

---

## 🐳 Docker Deployment (Alternative)

If you prefer running via Docker Compose:

```bash
# Start container
docker compose up -d

# View container logs
docker compose logs -f

# Restart container
docker compose restart
```

*Note: The container uses `network_mode: host` to optimize WebRTC UDP streaming performance.*

---

## 🛡️ Firewall & Ports Reference

If running a firewall on Ubuntu Server, ensure the following ports are open:

| Port | Protocol | Purpose |
|---|---|---|
| `8085` | TCP | Video Wall Web Dashboard |
| `1984` | TCP | go2rtc API & WebRTC signaling |
| `8555` | TCP / UDP | WebRTC media transmission |
| `8560` | TCP | Internal RTSP proxy |

To automatically configure UFW:
```bash
dvr firewall
```

---

## 🔒 Optional: Nginx Reverse Proxy & SSL

An Nginx configuration template is provided in [`nginx/dvr-wall.conf`](nginx/dvr-wall.conf) to serve the entire app on port `80`/`443` with Let's Encrypt SSL:

```bash
sudo cp nginx/dvr-wall.conf /etc/nginx/sites-available/dvr-wall
sudo ln -s /etc/nginx/sites-available/dvr-wall /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Enable SSL with Certbot
sudo certbot --nginx -d your-domain.com
```

---

## 🩺 Diagnostics & Troubleshooting

```bash
# Run health check
dvr health

# Check systemd service status
systemctl status dvr-wall

# Inspect live journal logs
journalctl -u dvr-wall -f -n 100
```
