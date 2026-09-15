#!/usr/bin/env python3
"""
Security Operations Video Wall - Universal Cross-Platform Launcher

Usage:
    python3 run.py              # Start both services in foreground (Ctrl+C to stop)
    python3 run.py start        # Start services in background (daemon mode)
    python3 run.py stop         # Stop background services
    python3 run.py restart      # Restart services
    python3 run.py status       # Check services status
"""

import sys
import os
import time
import socket
import signal
import subprocess
import platform

DIR = os.path.dirname(os.path.abspath(__file__))
GO2RTC_BIN = "go2rtc.exe" if platform.system() == "Windows" else "./go2rtc"
WEB_PORT = int(os.environ.get("WEB_PORT", 8085))
PID_FILE_GO2RTC = os.path.join(DIR, ".go2rtc.pid")
PID_FILE_HTTP = os.path.join(DIR, ".http.pid")


def get_all_ips():
    import re
    ips = []
    # Try hostname -I on Linux
    if platform.system() == "Linux":
        try:
            out = subprocess.check_output(["hostname", "-I"], stderr=subprocess.DEVNULL).decode().strip()
            for ip in out.split():
                if re.match(r"^(\d{1,3}\.){3}\d{1,3}$", ip):
                    if not ip.startswith("127.") and not ip.startswith("172.17.") and not ip.startswith("172.18.") and not ip.startswith("172.19.") and not ip.startswith("172.20.") and not ip.startswith("172.21."):
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

    # Hostname method
    try:
        host_ip = socket.gethostbyname(socket.gethostname())
        if host_ip not in ips and not host_ip.startswith("127."):
            ips.append(host_ip)
    except Exception:
        pass

    seen = set()
    dedup = [x for x in ips if not (x in seen or seen.add(x))]
    return dedup if dedup else ["127.0.0.1"]


def check_prerequisites():
    bin_path = os.path.join(DIR, GO2RTC_BIN)
    if not os.path.exists(bin_path):
        # Look for linux binary without ./ prefix
        linux_bin = os.path.join(DIR, "go2rtc")
        if os.path.exists(linux_bin):
            os.chmod(linux_bin, 0o755)
        else:
            print(f"[!] Warning: go2rtc binary ({GO2RTC_BIN}) not found in {DIR}.")
            print("    Please download go2rtc from https://github.com/AlexxIT/go2rtc/releases")
    elif platform.system() != "Windows":
        try:
            os.chmod(bin_path, 0o755)
        except Exception:
            pass

    yaml_path = os.path.join(DIR, "go2rtc.yaml")
    cams_path = os.path.join(DIR, "cameras.js")
    if not os.path.exists(yaml_path) or not os.path.exists(cams_path):
        print("[*] Generating configuration files (go2rtc.yaml + cameras.js)...")
        subprocess.run([sys.executable, os.path.join(DIR, "gen_config.py")], check=True)

    # Ensure root path index.html is synchronized with wall.html
    wall_path = os.path.join(DIR, "wall.html")
    index_path = os.path.join(DIR, "index.html")
    if os.path.exists(wall_path):
        import shutil
        shutil.copyfile(wall_path, index_path)


def print_banner():
    ips = get_all_ips()
    primary = ips[0] if ips else "127.0.0.1"

    print("=" * 64)
    print("  🎥 16-CAMERA SECURITY VIDEO WALL IS RUNNING")
    print("=" * 64)
    print("  Local Access:")
    print(f"    http://localhost:{WEB_PORT}/\n")
    print("  Network / Remote Access URLs:")
    for ip in ips:
        print(f"    http://{ip}:{WEB_PORT}/")
    print("\n  Quick Access:")
    print(f"    🖥️  16-Camera Draggable Wall: http://{primary}:{WEB_PORT}/")
    print(f"    📡 go2rtc Stream Console:     http://{primary}:1984")
    print("=" * 64)


def run_foreground():
    check_prerequisites()
    go2rtc_exec = os.path.join(DIR, GO2RTC_BIN)
    print("[*] Starting go2rtc and web server...")

    p_go2rtc = subprocess.Popen([go2rtc_exec], cwd=DIR)
    p_http = subprocess.Popen([sys.executable, "-m", "http.server", str(WEB_PORT)], cwd=DIR)

    time.sleep(1)
    print_banner()
    print("  Press Ctrl+C to stop all services.\n")

    def shutdown(sig, frame):
        print("\n[*] Stopping services...")
        p_go2rtc.terminate()
        p_http.terminate()
        p_go2rtc.wait()
        p_http.wait()
        print("[✓] All services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown(None, None)


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


def get_process_pids(pattern):
    if platform.system() == "Windows":
        return []
    try:
        out = subprocess.check_output(["pgrep", "-f", pattern], stderr=subprocess.DEVNULL).decode().strip()
        return [int(p) for p in out.split() if p]
    except Exception:
        return []


def start_daemon():
    check_prerequisites()
    go2rtc_log = open(os.path.join(DIR, "go2rtc.log"), "a")
    http_log = open(os.path.join(DIR, "wall-server.log"), "a")
    go2rtc_exec = os.path.join(DIR, GO2RTC_BIN)

    # 1. Start go2rtc if not already listening on port 1984
    if is_port_in_use(1984):
        pids = get_process_pids("go2rtc")
        if pids:
            with open(PID_FILE_GO2RTC, "w") as f:
                f.write(str(pids[0]))
        print("  [✓] go2rtc is already running.")
    else:
        p_go2rtc = subprocess.Popen(
            [go2rtc_exec],
            cwd=DIR,
            stdout=go2rtc_log,
            stderr=go2rtc_log,
            stdin=subprocess.DEVNULL,
            start_new_session=True
        )
        with open(PID_FILE_GO2RTC, "w") as f:
            f.write(str(p_go2rtc.pid))

    # 2. Start HTTP server if not already listening on port WEB_PORT
    if is_port_in_use(WEB_PORT):
        pids = get_process_pids(f"http.server {WEB_PORT}")
        if pids:
            with open(PID_FILE_HTTP, "w") as f:
                f.write(str(pids[0]))
        print(f"  [✓] Web server is already running on port {WEB_PORT}.")
    else:
        p_http = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(WEB_PORT)],
            cwd=DIR,
            stdout=http_log,
            stderr=http_log,
            stdin=subprocess.DEVNULL,
            start_new_session=True
        )
        with open(PID_FILE_HTTP, "w") as f:
            f.write(str(p_http.pid))

    time.sleep(1)
    print("[✓] Services ready.")
    print_banner()


def is_pid_running(pid):
    if platform.system() == "Windows":
        try:
            out = subprocess.check_output(f"tasklist /fi \"PID eq {pid}\"", shell=True).decode()
            return str(pid) in out
        except Exception:
            return False
    else:
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False


def stop_daemon():
    print("[*] Stopping Video Wall services...")

    # Stop via PID files
    for pid_file in [PID_FILE_GO2RTC, PID_FILE_HTTP]:
        if os.path.exists(pid_file):
            try:
                with open(pid_file) as f:
                    pid = int(f.read().strip())
                if is_pid_running(pid):
                    if platform.system() == "Windows":
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        os.kill(pid, signal.SIGTERM)
            except Exception:
                pass
            try:
                os.remove(pid_file)
            except Exception:
                pass

    # Linux fallback pkill
    if platform.system() != "Windows":
        subprocess.run(["pkill", "-f", "go2rtc"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", f"http.server {WEB_PORT}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Also clean up old 8080 if lingering
        subprocess.run(["pkill", "-f", "http.server 8080"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(1)
    print("[✓] All services stopped.")


def status():
    print("=== Service Status ===")
    ips = get_all_ips()
    print(f"Host IP(s): {', '.join(ips)}")

    # Check go2rtc
    if is_port_in_use(1984):
        pids = get_process_pids("go2rtc")
        pid_str = f" (PID: {pids[0]})" if pids else ""
        print(f"  [RUNNING] go2rtc (Port 1984/8555){pid_str}")
    else:
        print("  [STOPPED] go2rtc")

    # Check HTTP server
    if is_port_in_use(WEB_PORT):
        pids = get_process_pids(f"http.server {WEB_PORT}")
        pid_str = f" (PID: {pids[0]})" if pids else ""
        print(f"  [RUNNING] Web Server (Port {WEB_PORT}){pid_str}")
    else:
        print(f"  [STOPPED] Web Server (Port {WEB_PORT})")


if __name__ == "__main__":
    action = sys.argv[1].lower() if len(sys.argv) > 1 else "foreground"

    if action in ["foreground", "run"]:
        run_foreground()
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
    else:
        print("Usage: python3 run.py [foreground | start | stop | restart | status]")
        sys.exit(1)
