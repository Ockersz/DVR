#!/usr/bin/env python3
"""
Security Operations Video Wall - Production Server & Process Supervisor

Usage:
    python3 run.py              # Run foreground supervisor (used by systemd/Docker/interactive)
    python3 run.py start        # Run in background (standalone daemon mode)
    python3 run.py stop         # Stop background daemon
    python3 run.py restart      # Restart background daemon
    python3 run.py status       # Print detailed service status & network URLs
    python3 run.py health       # Check health of go2rtc and web endpoints
"""

import sys
import os
import time
import socket
import signal
import subprocess
import platform
import json
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading

DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(DIR, "config.json")
PID_FILE = os.path.join(DIR, ".dvr-wall.pid")
PID_FILE_GO2RTC = os.path.join(DIR, ".go2rtc.pid")
PID_FILE_HTTP = os.path.join(DIR, ".http.pid")

# Load configuration values
def get_server_config():
    web_port = int(os.environ.get("WEB_PORT", 8085))
    api_port = int(os.environ.get("GO2RTC_API_PORT", 1984))
    webrtc_port = int(os.environ.get("GO2RTC_WEBRTC_PORT", 8555))
    rtsp_port = int(os.environ.get("GO2RTC_RTSP_PORT", 8560))

    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            srv = cfg.get("server", {})
            web_port = int(srv.get("web_port", web_port))
            api_port = int(srv.get("api_port", api_port))
            webrtc_port = int(srv.get("webrtc_port", webrtc_port))
            rtsp_port = int(srv.get("rtsp_port", rtsp_port))
        except Exception:
            pass

    return {
        "web_port": web_port,
        "api_port": api_port,
        "webrtc_port": webrtc_port,
        "rtsp_port": rtsp_port,
    }


CFG = get_server_config()
GO2RTC_BIN = "go2rtc.exe" if platform.system() == "Windows" else "./go2rtc"


def get_all_ips():
    import re
    ips = []
    # Linux hostname -I
    if platform.system() == "Linux":
        try:
            out = subprocess.check_output(["hostname", "-I"], stderr=subprocess.DEVNULL).decode().strip()
            for ip in out.split():
                if re.match(r"^(\d{1,3}\.){3}\d{1,3}$", ip):
                    if not ip.startswith("127.") and not ip.startswith("172.17.") and not ip.startswith("172.18."):
                        ips.append(ip)
        except Exception:
            pass

    # Generic socket method
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        if local_ip not in ips and not local_ip.startswith("127."):
            ips.append(local_ip)
        s.close()
    except Exception:
        pass

    seen = set()
    dedup = [x for x in ips if not (x in seen or seen.add(x))]
    return dedup if dedup else ["127.0.0.1"]


def check_prerequisites():
    bin_path = os.path.join(DIR, GO2RTC_BIN)
    linux_bin = os.path.join(DIR, "go2rtc")

    # Check for go2rtc binary
    if not os.path.exists(bin_path) and not os.path.exists(linux_bin):
        print(f"[!] Warning: go2rtc binary not found in {DIR}.")
        print("    Attempting automatic download for Linux architecture...")
        arch = platform.machine().lower()
        target = "go2rtc_linux_amd64" if arch in ("x86_64", "amd64") else ("go2rtc_linux_arm64" if arch in ("aarch64", "arm64") else "go2rtc_linux_arm")
        url = f"https://github.com/AlexxIT/go2rtc/releases/latest/download/{target}"
        try:
            urllib.request.urlretrieve(url, linux_bin)
            os.chmod(linux_bin, 0o755)
            print(f"[✓] Downloaded {target} -> {linux_bin}")
        except Exception as e:
            print(f"[!] Failed to auto-download go2rtc ({e}). Please install manually.")

    if os.path.exists(linux_bin) and platform.system() != "Windows":
        try:
            os.chmod(linux_bin, 0o755)
        except Exception:
            pass

    # Ensure configs exist
    yaml_path = os.path.join(DIR, "go2rtc.yaml")
    cams_path = os.path.join(DIR, "cameras.js")
    if not os.path.exists(yaml_path) or not os.path.exists(cams_path):
        print("[*] Generating configuration files (go2rtc.yaml + cameras.js)...")
        subprocess.run([sys.executable, os.path.join(DIR, "gen_config.py")], check=True)

    # Synchronize index.html with wall.html
    wall_path = os.path.join(DIR, "wall.html")
    index_path = os.path.join(DIR, "index.html")
    if os.path.exists(wall_path):
        import shutil
        shutil.copyfile(wall_path, index_path)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class ProductionHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, format, *args):
        # In production, reduce noise for static asset polling
        msg = format % args
        if "/health" in msg or "/api/status" in msg:
            return
        # Standard access logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {msg}\n")

    def end_headers(self):
        # Security and caching headers
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Access-Control-Allow-Origin", "*")
        path = self.path.split("?")[0]
        if path.endswith((".js", ".json", ".html")) or path == "/":
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        else:
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()

    def do_GET(self):
        req_path = self.path.split("?")[0]

        # Health endpoint for monitoring/load balancers/systemd
        if req_path in ("/health", "/api/status"):
            is_go2rtc_ok = is_port_in_use(CFG["api_port"])
            status_code = 200 if is_go2rtc_ok else 503
            res = {
                "status": "healthy" if is_go2rtc_ok else "degraded",
                "web_server": "running",
                "go2rtc_api": "running" if is_go2rtc_ok else "stopped",
                "ports": CFG,
                "timestamp": time.time()
            }
            body = json.dumps(res, indent=2).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # Map root or /wall to wall.html
        if req_path in ("/", "/wall"):
            self.path = "/wall.html"

        return super().do_GET()


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def get_process_pids(pattern):
    if platform.system() == "Windows":
        return []
    try:
        out = subprocess.check_output(["pgrep", "-f", pattern], stderr=subprocess.DEVNULL).decode().strip()
        return [int(p) for p in out.split() if p]
    except Exception:
        return []


def is_pid_running(pid):
    if not pid or pid <= 0:
        return False
    if platform.system() == "Windows":
        try:
            out = subprocess.check_output(f'tasklist /fi "PID eq {pid}"', shell=True).decode()
            return str(pid) in out
        except Exception:
            return False
    else:
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False


def print_banner():
    cfg = get_server_config()
    ips = get_all_ips()
    primary = ips[0] if ips else "127.0.0.1"

    print("=" * 66)
    print("  🎥 SECURITY OPERATIONS VIDEO WALL (PRODUCTION ENGINE)")
    print("=" * 66)
    print("  Local Access:")
    print(f"    http://localhost:{cfg['web_port']}/\n")
    print("  Network Access URLs:")
    for ip in ips:
        print(f"    http://{ip}:{cfg['web_port']}/")
    print("\n  Direct Endpoints:")
    print(f"    🖥️  Video Wall App:    http://{primary}:{cfg['web_port']}/")
    print(f"    📡 Media Console:      http://{primary}:{cfg['api_port']}/")
    print(f"    🩺 Health Check:       http://{primary}:{cfg['web_port']}/health")
    print("=" * 66)


def run_supervisor():
    """
    Main supervisor process:
    - Runs in foreground (handles SIGTERM/SIGINT/SIGHUP)
    - Starts the embedded Threaded HTTP server
    - Spawns & monitors the go2rtc process, auto-restarting if it crashes
    """
    check_prerequisites()
    cfg = get_server_config()

    print("[*] Starting Video Wall supervisor...")
    go2rtc_exec = os.path.join(DIR, GO2RTC_BIN)
    if not os.path.exists(go2rtc_exec):
        go2rtc_exec = os.path.join(DIR, "go2rtc")

    # Start Embedded HTTP Server
    try:
        httpd = ThreadedHTTPServer(("0.0.0.0", cfg["web_port"]), ProductionHTTPHandler)
    except OSError as e:
        print(f"[!] Error: Could not bind web server to port {cfg['web_port']}: {e}")
        sys.exit(1)

    http_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    http_thread.start()
    print(f"[✓] Web server listening on port {cfg['web_port']}")

    # Start go2rtc Media Engine
    go2rtc_proc = None

    def start_media_engine():
        nonlocal go2rtc_proc
        if is_port_in_use(cfg["api_port"]):
            print(f"  [i] Media engine already running on port {cfg['api_port']}")
            return None
        print("[*] Launching go2rtc media engine...")
        proc = subprocess.Popen(
            [go2rtc_exec],
            cwd=DIR,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        return proc

    go2rtc_proc = start_media_engine()
    time.sleep(1)
    print_banner()

    running = True

    def handle_shutdown(signum, frame):
        nonlocal running
        print(f"\n[*] Received signal {signum}. Shutting down cleanly...")
        running = False
        try:
            httpd.shutdown()
            httpd.server_close()
        except Exception:
            pass
        if go2rtc_proc and go2rtc_proc.poll() is None:
            go2rtc_proc.terminate()
            try:
                go2rtc_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                go2rtc_proc.kill()
        print("[✓] All services cleanly stopped.")
        sys.exit(0)

    def handle_reload(signum, frame):
        nonlocal go2rtc_proc
        print("\n[*] Reload signal received. Re-generating configurations...")
        try:
            subprocess.run([sys.executable, os.path.join(DIR, "gen_config.py")], check=True)
            if go2rtc_proc and go2rtc_proc.poll() is None:
                go2rtc_proc.terminate()
                go2rtc_proc.wait(timeout=5)
            go2rtc_proc = start_media_engine()
            print("[✓] Configuration reloaded successfully.")
        except Exception as e:
            print(f"[!] Reload failed: {e}")

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    if hasattr(signal, "SIGHUP"):
        signal.signal(signal.SIGHUP, handle_reload)

    # Supervisor Watchdog Loop
    try:
        while running:
            time.sleep(2)
            # Watchdog: ensure go2rtc is alive
            if go2rtc_proc is not None and go2rtc_proc.poll() is not None:
                exit_code = go2rtc_proc.returncode
                print(f"[!] Warning: go2rtc exited unexpectedly with code {exit_code}. Restarting in 3s...")
                time.sleep(3)
                if running:
                    go2rtc_proc = start_media_engine()
    except KeyboardInterrupt:
        handle_shutdown(signal.SIGINT, None)


def start_daemon():
    """Start supervisor as a background daemon process"""
    check_prerequisites()
    cfg = get_server_config()

    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            if is_pid_running(pid):
                print(f"[!] DVR Video Wall is already running (PID: {pid}).")
                print_banner()
                return
        except Exception:
            pass

    log_file = open(os.path.join(DIR, "wall-server.log"), "a", encoding="utf-8")
    proc = subprocess.Popen(
        [sys.executable, os.path.abspath(__file__), "run"],
        cwd=DIR,
        stdout=log_file,
        stderr=log_file,
        stdin=subprocess.DEVNULL,
        start_new_session=True
    )
    with open(PID_FILE, "w") as f:
        f.write(str(proc.pid))

    time.sleep(1.5)
    print(f"[✓] Started background service (PID: {proc.pid}).")
    print_banner()


def free_port(port):
    if not is_port_in_use(port):
        return
    if platform.system() != "Windows":
        try:
            out = subprocess.check_output(["fuser", f"{port}/tcp"], stderr=subprocess.DEVNULL).decode().strip()
            for pid_str in out.split():
                try:
                    pid = int(pid_str)
                    os.kill(pid, signal.SIGKILL)
                except Exception:
                    pass
        except Exception:
            pass


def stop_daemon():
    print("[*] Stopping Video Wall services...")
    cfg = get_server_config()

    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            if is_pid_running(pid):
                os.kill(pid, signal.SIGTERM)
                time.sleep(0.5)
                if is_pid_running(pid):
                    os.kill(pid, signal.SIGKILL)
        except Exception:
            pass
        try:
            os.remove(PID_FILE)
        except Exception:
            pass

    # Cleanup legacy PIDs if present
    for pfile in [PID_FILE_GO2RTC, PID_FILE_HTTP]:
        if os.path.exists(pfile):
            try:
                with open(pfile) as f:
                    pid = int(f.read().strip())
                if is_pid_running(pid):
                    os.kill(pid, signal.SIGKILL)
            except Exception:
                pass
            try:
                os.remove(pfile)
            except Exception:
                pass

    if platform.system() != "Windows":
        subprocess.run(["pkill", "-9", "-f", "go2rtc"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-9", "-f", "run.py run"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-9", "-f", f"http.server {cfg['web_port']}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        free_port(cfg["web_port"])
        free_port(cfg["api_port"])

    time.sleep(1)
    print("[✓] All services stopped.")


def status():
    cfg = get_server_config()
    ips = get_all_ips()

    print("=" * 60)
    print("           🎥 DVR VIDEO WALL SERVICE STATUS")
    print("=" * 60)
    print(f"Host IP(s)      : {', '.join(ips)}")

    # Check systemd status if on Linux
    if platform.system() == "Linux":
        try:
            # Check user systemd
            res_user = subprocess.run(["systemctl", "--user", "is-active", "dvr-wall"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            state_user = res_user.stdout.decode().strip()
            if state_user in ("active", "activating"):
                print(f"Systemd Service : \033[32m● ACTIVE\033[0m (systemd --user dvr-wall.service)")
            else:
                # Check system systemd
                res_sys = subprocess.run(["systemctl", "is-active", "dvr-wall"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                state_sys = res_sys.stdout.decode().strip()
                if state_sys in ("active", "activating"):
                    print(f"Systemd Service : \033[32m● ACTIVE\033[0m (systemd dvr-wall.service)")
                elif state_sys in ("inactive", "failed"):
                    print(f"Systemd Service : \033[31m○ {state_sys.upper()}\033[0m (dvr-wall.service)")
        except Exception:
            pass

    # Check ports
    web_ok = is_port_in_use(cfg["web_port"])
    api_ok = is_port_in_use(cfg["api_port"])

    web_badge = "\033[32m[RUNNING]\033[0m" if web_ok else "\033[31m[STOPPED]\033[0m"
    api_badge = "\033[32m[RUNNING]\033[0m" if api_ok else "\033[31m[STOPPED]\033[0m"

    print(f"Web Server      : {web_badge} Port {cfg['web_port']}")
    print(f"go2rtc Engine   : {api_badge} Port {cfg['api_port']} (API) / {cfg['webrtc_port']} (WebRTC)")

    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f:
                pid = int(f.read().strip())
            if is_pid_running(pid):
                print(f"Daemon PID      : {pid}")
        except Exception:
            pass

    print("-" * 60)
    if web_ok and api_ok:
        primary = ips[0] if ips else "127.0.0.1"
        print(f"Dashboard URL   : http://{primary}:{cfg['web_port']}/")
        print(f"Status          : \033[32mOPERATIONAL\033[0m")
    else:
        print(f"Status          : \033[33mATTENTION REQUIRED\033[0m")
    print("=" * 60)


def health_check():
    cfg = get_server_config()
    print("[*] Running health diagnostics...")
    errors = 0

    # 1. Web server check
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{cfg['web_port']}/health")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            print(f"  [✓] Web Server (/health): OK (status: {data.get('status')})")
    except Exception as e:
        print(f"  [✗] Web Server (/health): FAILED ({e})")
        errors += 1

    # 2. go2rtc API check
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{cfg['api_port']}/api/streams")
        with urllib.request.urlopen(req, timeout=3) as resp:
            streams = json.loads(resp.read().decode())
            stream_count = len(streams) if isinstance(streams, dict) else 0
            print(f"  [✓] go2rtc API (/api/streams): OK ({stream_count} streams configured)")
    except Exception as e:
        print(f"  [✗] go2rtc API (/api/streams): FAILED ({e})")
        errors += 1

    if errors == 0:
        print("\n[✓] System health check PASSED - All services responsive.")
        sys.exit(0)
    else:
        print(f"\n[!] System health check FAILED with {errors} issue(s).")
        sys.exit(1)


if __name__ == "__main__":
    action = sys.argv[1].lower() if len(sys.argv) > 1 else "run"

    if action in ["run", "foreground", "serve"]:
        run_supervisor()
    elif action == "start":
        start_daemon()
    elif action == "stop":
        stop_daemon()
    elif action == "restart":
        stop_daemon()
        time.sleep(1)
        start_daemon()
    elif action == "status":
        status()
    elif action in ["health", "test"]:
        health_check()
    else:
        print("Usage: python3 run.py [run | start | stop | restart | status | health]")
        sys.exit(1)
