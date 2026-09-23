#!/usr/bin/env python3
"""
Generate the go2rtc aggregator config + the wall's camera list.

    python3 gen_config.py              # build from config.json (or fallback defaults)
    python3 gen_config.py --discover   # re-query all DVRs live and update channel names
    python3 gen_config.py --save       # save discovered names back into config.json

Outputs (in current directory):
  - go2rtc.yaml   aggregator config for go2rtc (chmod 600)
  - cameras.js    camera list for wall.html / web clients

Standard library only. Works the same on Windows / Linux / macOS.
"""

import re
import sys
import os
import json
from urllib.parse import quote
import urllib.request
import ssl

DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(DIR, "config.json")

# ============================================================================
# Defaults
DEFAULT_USER = os.environ.get("DEFAULT_DVR_USER", "admin")
DEFAULT_PW = os.environ.get("DEFAULT_DVR_PASSWORD", "Araliyaflower#24")

API_PORT = int(os.environ.get("GO2RTC_API_PORT", 1984))
WEBRTC_PORT = int(os.environ.get("GO2RTC_WEBRTC_PORT", 8555))
RTSP_PORT = int(os.environ.get("GO2RTC_RTSP_PORT", 8560))
WEB_PORT = int(os.environ.get("WEB_PORT", 8085))

TRANSCODE = os.environ.get("TRANSCODE", "false").lower() in ("true", "1", "yes")
HWACCEL = os.environ.get("HWACCEL", "vaapi")
LOG_LEVEL = os.environ.get("LOG_LEVEL", "info")

# Fallback Inventory (7 DVRs x 16 Channels = 112 Total Cameras)
FALLBACK_INVENTORY = [
    {
        "name": "dvr20", "ip": "192.168.2.20", "brand": "dahua", "https": True, "title": "DVR .20 (Dahua)",
        "user": "", "password": "",
        "channels": [
            {"channel": 1, "name": "SQ14"}, {"channel": 2, "name": "2nd gate outside"},
            {"channel": 3, "name": "SQ13"}, {"channel": 4, "name": "main gate inside"},
            {"channel": 5, "name": "SQ12"}, {"channel": 6, "name": "guardroom viwe"},
            {"channel": 7, "name": "canteen in"}, {"channel": 8, "name": "woshroom aria"},
            {"channel": 9, "name": "parking"}, {"channel": 10, "name": "scale"},
            {"channel": 11, "name": ""}, {"channel": 12, "name": "kitchen"},
            {"channel": 13, "name": "canteen inside"}, {"channel": 14, "name": "genarator"},
            {"channel": 15, "name": ""}, {"channel": 16, "name": ""}
        ]
    },
    {
        "name": "dvr40", "ip": "192.168.2.40", "brand": "dahua", "https": False, "title": "DVR .40 (Dahua)",
        "user": "", "password": "",
        "channels": [
            {"channel": 1, "name": ""}, {"channel": 2, "name": ""}, {"channel": 3, "name": ""}, {"channel": 4, "name": ""},
            {"channel": 5, "name": ""}, {"channel": 6, "name": ""}, {"channel": 7, "name": "SQ06"}, {"channel": 8, "name": "SQ03"},
            {"channel": 9, "name": ""}, {"channel": 10, "name": "SQ05"}, {"channel": 11, "name": "SQ04"}, {"channel": 12, "name": ""},
            {"channel": 13, "name": "SQ01"}, {"channel": 14, "name": ""}, {"channel": 15, "name": ""}, {"channel": 16, "name": "SQ09"}
        ]
    },
    {
        "name": "dvr90", "ip": "192.168.2.90", "brand": "dahua", "https": False, "title": "DVR .90 (Dahua)",
        "user": "", "password": "", "channels": []
    },
    {
        "name": "dvr95", "ip": "192.168.2.95", "brand": "dahua", "https": False, "title": "DVR .95 (Dahua)",
        "user": "", "password": "", "channels": []
    },
    {
        "name": "hik205", "ip": "192.168.2.205", "brand": "hikvision", "title": "DVR .205 (Hikvision)",
        "user": "", "password": "", "channels": []
    },
    {
        "name": "hik206", "ip": "192.168.2.206", "brand": "hikvision", "title": "DVR .206 (Hikvision)",
        "user": "", "password": "", "channels": []
    },
    {
        "name": "hik217", "ip": "192.168.2.217", "brand": "hikvision", "title": "DVR .217 (Hikvision)",
        "user": "", "password": "", "channels": []
    }
]


def load_config():
    global API_PORT, WEBRTC_PORT, RTSP_PORT, WEB_PORT, TRANSCODE, HWACCEL, LOG_LEVEL, DEFAULT_USER, DEFAULT_PW
    raw_dvrs = FALLBACK_INVENTORY

    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            srv = cfg.get("server", {})
            API_PORT = int(srv.get("api_port", API_PORT))
            WEBRTC_PORT = int(srv.get("webrtc_port", WEBRTC_PORT))
            RTSP_PORT = int(srv.get("rtsp_port", RTSP_PORT))
            WEB_PORT = int(srv.get("web_port", WEB_PORT))
            TRANSCODE = srv.get("transcode", TRANSCODE)
            HWACCEL = srv.get("hwaccel", HWACCEL)
            LOG_LEVEL = srv.get("log_level", LOG_LEVEL)

            auth = cfg.get("auth", {})
            DEFAULT_USER = auth.get("default_user", DEFAULT_USER)
            DEFAULT_PW = auth.get("default_password", DEFAULT_PW)

            if "dvrs" in cfg and isinstance(cfg["dvrs"], list):
                raw_dvrs = cfg["dvrs"]
        except Exception as e:
            print(f"[!] Warning: Failed reading {CONFIG_PATH} ({e}), using default inventory.")

    normalized = []
    for d in raw_dvrs:
        user = d.get("user") or DEFAULT_USER
        pw = d.get("password") or DEFAULT_PW
        
        # Parse channels list
        cams = []
        raw_channels = d.get("channels") or d.get("cams") or []
        ch_map = {}
        for item in raw_channels:
            if isinstance(item, dict):
                ch_map[int(item.get("channel", 1))] = item.get("name", "")
            elif isinstance(item, (list, tuple)) and len(item) >= 2:
                ch_map[int(item[0])] = item[1]

        for ch in range(1, 17):
            cams.append((ch, ch_map.get(ch, "")))

        normalized.append({
            "name": d.get("name", "dvr"),
            "title": d.get("title", d.get("name", "DVR")),
            "ip": d.get("ip", "127.0.0.1"),
            "brand": d.get("brand", "dahua").lower(),
            "https": bool(d.get("https", False)),
            "user": user,
            "pw": pw,
            "cams": cams
        })

    return normalized


def rtsp(dev, ch, sub):
    u, p, ip = quote(dev["user"]), quote(dev["pw"]), dev["ip"]
    if dev["brand"] == "dahua":
        return f"rtsp://{u}:{p}@{ip}:554/cam/realmonitor?channel={ch}&subtype={1 if sub else 0}"
    # hikvision: channel 1 -> 101/102, channel 2 -> 201/202, etc.
    code = ch * 100 + (2 if sub else 1)
    return f"rtsp://{u}:{p}@{ip}:554/Streaming/Channels/{code}"


def label(dev, ch, name):
    multi = len(dev["cams"]) > 1
    if name and not re.fullmatch(r"(Channel|Camera\s*)\d+", name, re.IGNORECASE):
        return name
    return f'{dev["title"]} · Ch{ch}' if multi else dev["title"]


# ---- Live discovery straight from the DVRs ----------------------------------
def dahua_api(dev, path):
    schemes = (["https", "http"] if dev.get("https") else ["http", "https"])
    for sc in schemes:
        url = f"{sc}://{dev['ip']}{path}"
        mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
        mgr.add_password(None, url, dev["user"], dev["pw"])
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        op = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(mgr),
                                         urllib.request.HTTPSHandler(context=ctx))
        try:
            txt = op.open(url, timeout=4).read().decode("utf-8", "ignore")
            if "channels[" in txt or "table." in txt:
                return txt
        except Exception:
            continue
    return None


def discover_dahua(dev):
    titl = dahua_api(dev, "/cgi-bin/configManager.cgi?action=getConfig&name=ChannelTitle")
    if titl is None:
        print(f"  [-] {dev['name']} ({dev['ip']}): unreachable or auth failed, keeping configured names")
        return
    names = {int(i): n.strip() for i, n in re.findall(r"table\.ChannelTitle\[(\d+)\]\.Name=(.*)", titl)}
    cams = [(ch, names.get(ch - 1, "")) for ch in range(1, 17)]
    dev["cams"] = cams
    print(f"  [✓] {dev['name']} ({dev['ip']}): updated 16 channels from Dahua API")


def discover_hikvision(dev):
    url = f"http://{dev['ip']}/ISAPI/System/Video/inputs/channels"
    mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    mgr.add_password(None, url, dev["user"], dev["pw"])
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    op = urllib.request.build_opener(urllib.request.HTTPDigestAuthHandler(mgr),
                                     urllib.request.HTTPSHandler(context=ctx))
    try:
        xml = op.open(url, timeout=4).read().decode("utf-8", "ignore")
        items = re.findall(r"<VideoInputChannel\b.*?</VideoInputChannel>", xml, re.DOTALL)
        names = {}
        for it in items:
            cid = re.search(r"<id>(\d+)</id>", it)
            name = re.search(r"<name>(.*?)</name>", it)
            if cid:
                names[int(cid.group(1))] = name.group(1) if name else ""
        cams = [(ch, names.get(ch, "")) for ch in range(1, 17)]
        dev["cams"] = cams
        print(f"  [✓] {dev['name']} ({dev['ip']}): updated 16 channels from Hikvision ISAPI")
    except Exception as e:
        print(f"  [-] {dev['name']} ({dev['ip']}): ISAPI unreachable ({e}), keeping configured names")


def save_config_json(inventory):
    data = {
        "server": {
            "web_port": WEB_PORT,
            "api_port": API_PORT,
            "webrtc_port": WEBRTC_PORT,
            "rtsp_port": RTSP_PORT,
            "transcode": TRANSCODE,
            "hwaccel": HWACCEL,
            "log_level": LOG_LEVEL
        },
        "auth": {
            "default_user": DEFAULT_USER,
            "default_password": DEFAULT_PW
        },
        "dvrs": []
    }
    for d in inventory:
        channels = [{"channel": ch, "name": name} for ch, name in d["cams"]]
        dvr_entry = {
            "name": d["name"],
            "title": d["title"],
            "ip": d["ip"],
            "brand": d["brand"],
            "channels": channels
        }
        if d.get("https"):
            dvr_entry["https"] = True
        data["dvrs"].append(dvr_entry)

    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[✓] Saved updated configuration to {CONFIG_PATH}")


def generate():
    inventory = load_config()

    go2rtc_host = os.environ.get("GO2RTC_HOST", None)
    for arg in sys.argv:
        if arg.startswith("--host="):
            go2rtc_host = arg.split("=", 1)[1]
        elif arg == "--host" and sys.argv.index(arg) + 1 < len(sys.argv):
            go2rtc_host = sys.argv[sys.argv.index(arg) + 1]

    if "--discover" in sys.argv:
        print("[*] Discovering live channels from DVRs on LAN...")
        for d in inventory:
            if d["brand"] == "dahua":
                discover_dahua(d)
            elif d["brand"] == "hikvision":
                discover_hikvision(d)
        if "--save" in sys.argv:
            save_config_json(inventory)

    # Build go2rtc.yaml
    yaml = [
        "# AUTO-GENERATED by gen_config.py -- edit config.json, then re-run.",
        "api:",
        f'  listen: ":{API_PORT}"',
        '  origin: "*"',
        "rtsp:",
        f'  listen: ":{RTSP_PORT}"',
        "webrtc:",
        f'  listen: ":{WEBRTC_PORT}"',
        "log:",
        f"  level: {LOG_LEVEL}",
        "streams:"
    ]
    cams_js = []

    hw = f"#hardware={HWACCEL}" if HWACCEL else ""
    for d in inventory:
        for ch, name in d["cams"]:
            base = f'{d["name"]}_ch{ch}'
            yaml += [f"  {base}:", f"    - {rtsp(d, ch, False)}"]
            if TRANSCODE:
                yaml += [f"    - ffmpeg:{base}#video=h264{hw}"]
            yaml += [f"  {base}_sub:", f"    - {rtsp(d, ch, True)}"]
            if TRANSCODE:
                yaml += [f"    - ffmpeg:{base}_sub#video=h264{hw}"]
            cams_js.append({
                "name": base,
                "label": label(d, ch, name),
                "group": d["title"],
                "tile": f"{base}_sub",
                "solo": base
            })

    yaml_file = os.path.join(DIR, "go2rtc.yaml")
    with open(yaml_file, "w", encoding="utf-8") as f:
        f.write("\n".join(yaml) + "\n")

    # Set secure permissions on go2rtc.yaml (contains passwords)
    try:
        os.chmod(yaml_file, 0o600)
    except Exception:
        pass

    # Build cameras.js
    cams_file = os.path.join(DIR, "cameras.js")
    with open(cams_file, "w", encoding="utf-8") as f:
        if go2rtc_host:
            f.write(f'window.GO2RTC = "http://{go2rtc_host}:{API_PORT}";\n')
        else:
            f.write(
                '// Dynamic go2rtc host resolution: automatically adapts to the current hostname/IP of the browser\n'
                'window.GO2RTC = (function() {\n'
                '  if (typeof window !== "undefined" && window.location && window.location.hostname) {\n'
                '    var proto = window.location.protocol === "https:" ? "https:" : "http:";\n'
                f'    return proto + "//" + window.location.hostname + ":{API_PORT}";\n'
                '  }\n'
                f'  return "http://127.0.0.1:{API_PORT}";\n'
                '})();\n\n'
            )
        f.write("window.CAMERAS = " + json.dumps(cams_js, ensure_ascii=False, indent=2) + ";\n")

    print(f"[✓] Generated go2rtc.yaml + cameras.js: {len(cams_js)} channels ({len(cams_js)*2} streams).")


if __name__ == "__main__":
    generate()
