# Security Operations Video Wall (Mixed Dahua + Hikvision)

One browser-based video wall displaying cameras from multiple recorders regardless of brand.
Aggregates standard **RTSP** feeds using [go2rtc](https://github.com/AlexxIT/go2rtc) and serves them as low-latency **WebRTC** (with MSE fallback).

**Dynamic & Cross-platform:** Automatically detects and binds to whatever IP or network interface you run on (LAN, Wi-Fi, Tailscale, VPN, localhost). No hardcoded IPs needed.

```
 DVR .20 (Dahua 16ch)   ──┐
 DVR .40 (Dahua 16ch)   ──┤
 DVR .90 (Dahua 16ch)   ──┼─ RTSP ─▶ go2rtc (:1984/:8555) ─▶ WebRTC/MSE ─▶ wall.html (:8085)
 DVR .95 (Dahua 16ch)   ──┤
 Cam .205/.206/.217 (Hik) ┘
```

---

## 🚀 Quick Start (1 or 2 Commands)

### 1. Start the Video Wall
```bash
./start.sh
```
*(Or on any OS via Python: `python3 run.py`)*

This automatically:
- Checks prerequisites and sets executable permissions.
- Builds `go2rtc.yaml` and `cameras.js` if not already present.
- Starts `go2rtc` media engine and the HTTP web server on port `8085` (non-conflicting).
- Detects all your server's network IPs dynamically and prints ready-to-click URLs.

### 2. Stop the Video Wall
```bash
./stop.sh
```
*(Or `./start.sh stop` / `python3 run.py stop`)*

---

## 🛠️ Management Commands

| Command | Action |
|---|---|
| `./start.sh` | Start services in background (daemon mode) |
| `./start.sh stop` | Stop all background services |
| `./start.sh restart` | Restart all services |
| `./start.sh status` | Check running state, PIDs, and active host IPs |
| `./start.sh logs` | View live combined log output |
| `python3 run.py` | Interactive foreground mode (press `Ctrl+C` to stop) |

---

## 🌐 Accessing the Video Wall

Once started, open any browser on the same network:

- **16-Camera Draggable Grid**: `http://<YOUR_IP>:8085/wall.html`
- **Local Access (on server PC)**: `http://localhost:8085/wall.html`
- **go2rtc Native Stream Admin**: `http://<YOUR_IP>:1984`

### 🎮 How to Use:
- **Drag & Drop**: Click and drag any camera tile to swap its position in the 4x4 grid in real-time. Positions are automatically saved.
- **Slide Navigation**: Use the slide dropdown or `◀` / `▶` buttons (or `Left`/`Right` arrow keys) to toggle between sets of 16 cameras (e.g. Slide 1: 1–16, Slide 2: 17–32, etc.).
- **Solo HD View**: Double-click or click `⤢` on any tile to view high-resolution main stream. Press `Esc` or `← Back` to return.
- **Assign / Rename**: Hover on any tile and click `⚙` to reassign to any channel from the 112-camera inventory or rename its label.
- **Reset Layout**: Click `↺ Reset Layout` in the top bar to restore default slot arrangement.
- **Fullscreen**: Click `⛶ Fullscreen` or press `F` / `F11`.

---

## 📁 Key Files

| File | Description |
|---|---|
| [`gen_config.py`](gen_config.py) | Camera inventory & credentials generator (`python3 gen_config.py`) |
| [`run.py`](run.py) | Cross-platform Python launcher and process manager |
| [`start.sh`](start.sh) / [`stop.sh`](stop.sh) | Quick shell lifecycle scripts |
| [`go2rtc.yaml`](go2rtc.yaml) | Stream routing configuration for go2rtc |
| [`cameras.js`](cameras.js) | Dynamic client metadata and camera mappings |
| [`wall.html`](wall.html) | Video wall frontend interface |

---

## ⚙️ Configuration & Adding Cameras

1. Edit `INVENTORY` in [`gen_config.py`](gen_config.py) to add DVR credentials and camera names.
2. Re-generate configuration:
   ```bash
   python3 gen_config.py
   # Or query DVRs live for channel names:
   python3 gen_config.py --discover
   ```
3. Restart services:
   ```bash
   ./start.sh restart
   ```

