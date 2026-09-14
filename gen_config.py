#!/usr/bin/env python3
"""
Generate the go2rtc aggregator config + the wall's camera list.

    python3 gen_config.py              # build from the INVENTORY below
    python3 gen_config.py --discover   # re-query all DVRs first (refresh names + channels)

Outputs (next to this script):
  - go2rtc.yaml   the aggregator config go2rtc reads on startup   (CONTAINS PASSWORDS)
  - cameras.js    the camera list wall.html loads                 (names only, no secrets)

Standard library only. Works the same on Windows / Linux / macOS.
"""

import re, sys, json
from urllib.parse import quote
import urllib.request, ssl

# ============================================================================
# Login (same account works for RTSP + DVR HTTP/ISAPI APIs)
USER = "admin"
PW   = "Araliyaflower#24"

import os

# Where go2rtc is reachable FROM THE BROWSER that opens the wall.
# By default, None means cameras.js will dynamically resolve the server host in the browser.
GO2RTC_HOST = os.environ.get("GO2RTC_HOST", None)
for arg in sys.argv:
    if arg.startswith("--host="):
        GO2RTC_HOST = arg.split("=", 1)[1]
    elif arg == "--host" and sys.argv.index(arg) + 1 < len(sys.argv):
        GO2RTC_HOST = sys.argv[sys.argv.index(arg) + 1]

API_PORT    = 1984
WEBRTC_PORT = 8555
RTSP_PORT   = 8560                  # go2rtc's internal RTSP

TRANSCODE = False                  # OFF: avoid CPU spikes by using native H.264 sub-streams
HWACCEL   = "vaapi"

# 7 DVRs x 16 Channels = 112 Total Cameras
INVENTORY = [
    {
        "name": "dvr20", "ip": "192.168.2.20", "brand": "dahua", "https": True, "title": "DVR .20 (Dahua)",
        "user": USER, "pw": PW,
        "cams": [
            (1, "SQ14"), (2, "2nd gate outside"), (3, "SQ13"), (4, "main gate inside"),
            (5, "SQ12"), (6, "guardroom viwe"), (7, "canteen in"), (8, "woshroom aria"),
            (9, "parking"), (10, "scale"), (11, ""), (12, "kitchen"),
            (13, "canteen inside"), (14, "genarator"), (15, ""), (16, "")
        ]
    },
    {
        "name": "dvr40", "ip": "192.168.2.40", "brand": "dahua", "https": False, "title": "DVR .40 (Dahua)",
        "user": USER, "pw": PW,
        "cams": [
            (1, ""), (2, ""), (3, ""), (4, ""),
            (5, ""), (6, ""), (7, "SQ06"), (8, "SQ03"),
            (9, ""), (10, "SQ05"), (11, "SQ04"), (12, ""),
            (13, "SQ01"), (14, ""), (15, ""), (16, "SQ09")
        ]
    },
    {
        "name": "dvr90", "ip": "192.168.2.90", "brand": "dahua", "https": False, "title": "DVR .90 (Dahua)",
        "user": USER, "pw": PW,
        "cams": [(ch, "") for ch in range(1, 17)]
    },
    {
        "name": "dvr95", "ip": "192.168.2.95", "brand": "dahua", "https": False, "title": "DVR .95 (Dahua)",
        "user": USER, "pw": PW,
        "cams": [(ch, "") for ch in range(1, 17)]
    },
    {
        "name": "hik205", "ip": "192.168.2.205", "brand": "hikvision", "title": "DVR .205 (Hikvision)",
        "user": USER, "pw": PW,
        "cams": [(ch, "") for ch in range(1, 17)]
    },
    {
        "name": "hik206", "ip": "192.168.2.206", "brand": "hikvision", "title": "DVR .206 (Hikvision)",
        "user": USER, "pw": PW,
        "cams": [(ch, "") for ch in range(1, 17)]
    },
    {
        "name": "hik217", "ip": "192.168.2.217", "brand": "hikvision", "title": "DVR .217 (Hikvision)",
        "user": USER, "pw": PW,
        "cams": [(ch, "") for ch in range(1, 17)]
    }
]
# ============================================================================

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


# ---- optional: refresh channel names straight from the DVRs -----------------
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
            txt = op.open(url, timeout=6).read().decode("utf-8", "ignore")
            if "channels[" in txt or "table." in txt:
                return txt
        except Exception:
            continue
    return None


def discover_dahua(dev):
    loss = dahua_api(dev, "/cgi-bin/eventManager.cgi?action=getEventIndexes&code=VideoLoss")
    titl = dahua_api(dev, "/cgi-bin/configManager.cgi?action=getConfig&name=ChannelTitle")
    if titl is None:
        print(f"  ! {dev['name']}: discovery failed, keeping configured list")
        return
    names = {int(i): n.strip() for i, n in re.findall(r"table\.ChannelTitle\[(\d+)\]\.Name=(.*)", titl)}
    # Update names for all 16 channels
    cams = [(ch, names.get(ch - 1, "")) for ch in range(1, 17)]
    dev["cams"] = cams
    print(f"  ✓ {dev['name']}: updated 16 channels")


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
        xml = op.open(url, timeout=6).read().decode("utf-8", "ignore")
        items = re.findall(r"<VideoInputChannel\b.*?</VideoInputChannel>", xml, re.DOTALL)
        names = {}
        for it in items:
            cid = re.search(r"<id>(\d+)</id>", it)
            name = re.search(r"<name>(.*?)</name>", it)
            if cid:
                names[int(cid.group(1))] = name.group(1) if name else ""
        cams = [(ch, names.get(ch, "")) for ch in range(1, 17)]
        dev["cams"] = cams
        print(f"  ✓ {dev['name']}: updated 16 channels from ISAPI")
    except Exception as e:
        print(f"  ! {dev['name']}: ISAPI error ({e}), keeping configured list")


if "--discover" in sys.argv:
    print("Discovering live channels from DVRs...")
    for d in INVENTORY:
        if d["brand"] == "dahua":
            discover_dahua(d)
        elif d["brand"] == "hikvision":
            discover_hikvision(d)

# ---- emit go2rtc.yaml + cameras.js -----------------------------------------
yaml = [
    "# AUTO-GENERATED by gen_config.py -- edit that file, then re-run. Contains passwords.",
    "api:", f'  listen: ":{API_PORT}"', '  origin: "*"',
    "rtsp:", f'  listen: ":{RTSP_PORT}"',
    "webrtc:", f'  listen: ":{WEBRTC_PORT}"',
    "log:", "  level: info", "streams:"
]
cams_js = []

hw = f"#hardware={HWACCEL}" if HWACCEL else ""
for d in INVENTORY:
    for ch, name in d["cams"]:
        base = f'{d["name"]}_ch{ch}'
        yaml += [f"  {base}:", f"    - {rtsp(d, ch, False)}"]         # main (solo/hero view)
        if TRANSCODE: yaml += [f"    - ffmpeg:{base}#video=h264{hw}"]
        yaml += [f"  {base}_sub:", f"    - {rtsp(d, ch, True)}"]      # sub  (grid tile / tour)
        if TRANSCODE: yaml += [f"    - ffmpeg:{base}_sub#video=h264{hw}"]
        cams_js.append({
            "name": base,
            "label": label(d, ch, name),
            "group": d["title"],
            "tile": f"{base}_sub",
            "solo": base
        })

with open("go2rtc.yaml", "w") as f:
    f.write("\n".join(yaml) + "\n")

with open("cameras.js", "w", encoding="utf-8") as f:
    if GO2RTC_HOST:
        f.write(f'window.GO2RTC = "http://{GO2RTC_HOST}:{API_PORT}";\n')
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

print(f"\nWrote go2rtc.yaml + cameras.js: {len(cams_js)} cameras ({len(cams_js)*2} streams incl. sub).")
