#!/usr/bin/env python3
"""DineIQ one-command local launcher (Windows / macOS / Linux).

Usage:
    python start_local.py                  # API :8000 + web :5173
    python start_local.py --web-port 3000  # custom ports (any URL you like)
    python start_local.py --no-browser     # don't auto-open the browser

What it does, in order:
  1. Installs missing Python deps (pip install -r requirements.txt)
  2. Installs frontend deps (npm install) if node_modules is missing
  3. Builds database/dineiq.db via the pure-Python pipeline if missing
     (no Spark/Java needed for the default build)
  4. Starts the FastAPI backend + Vite frontend, opens your browser

Stop everything with Ctrl+C.
"""
import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(ROOT, "Ranen", "dineiq")
DB_PATH = os.path.join(ROOT, "database", "dineiq.db")

PY_MODULES = [
    "fastapi", "uvicorn", "sqlalchemy", "pydantic", "jose", "bcrypt",
    "pandas", "numpy", "sklearn", "scipy", "pyarrow", "httpx",
    "openpyxl", "multipart",
]

# Pure-Python pipeline steps (mirrors scripts/run_all.sh without --spark).
PIPELINE_MODULES = [
    "cleaning", "integrate", "features", "profitability", "classify_menu",
    "segmentation", "basket", "peaks", "forecast", "wastage", "pricing",
    "promotions", "ratings", "anomalies", "slow_movers", "locations",
    "channels", "churn", "recommend", "whatif", "load_serving",
]


def run(cmd, **kw):
    print(f"$ {' '.join(cmd)}", flush=True)
    subprocess.run(cmd, check=True, **kw)


def wait_for(url, timeout=120):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if r.status < 500:
                    return True
        except Exception:
            time.sleep(1)
    return False


def main():
    ap = argparse.ArgumentParser(description="Run DineIQ locally.")
    ap.add_argument("--api-port", type=int, default=8000)
    ap.add_argument("--web-port", type=int, default=5173)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    print("=== DineIQ local setup ===")

    # 1. Python deps
    missing = []
    for m in PY_MODULES:
        try:
            __import__(m)
        except Exception:
            missing.append(m)
    if missing:
        print(f"Installing Python deps ({len(missing)} missing)...")
        run([sys.executable, "-m", "pip", "install", "--user",
             "--break-system-packages", "--quiet",
             "-r", os.path.join(ROOT, "requirements.txt")])
    else:
        print("Python deps OK.")

    # 2. Node deps
    if not os.path.isdir(os.path.join(WEB_DIR, "node_modules")):
        if not shutil.which("npm"):
            sys.exit("ERROR: Node.js/npm not found. Install Node 18+ from https://nodejs.org, then re-run.")
        print("Installing frontend deps (one-time, ~1 min)...")
        run(["npm", "install"], cwd=WEB_DIR)
    else:
        print("Frontend deps OK.")

    # 3. Serving database
    if not os.path.isfile(DB_PATH) or os.path.getsize(DB_PATH) == 0:
        print("Building analytics database (one-time, ~2 min)...")
        env = dict(os.environ)
        for mod in PIPELINE_MODULES:
            cmd = [sys.executable, "-m", f"python_pipeline.{mod}"]
            if mod == "forecast":
                cmd += ["--horizon", "28"]
            run(cmd, cwd=ROOT, env=env)
    else:
        print("Database OK.")

    # 4. Launch servers
    api_url = f"http://localhost:{args.api_port}"
    web_url = f"http://localhost:{args.web_port}"
    print("=== Starting servers (Ctrl+C to stop everything) ===")
    api = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "src.api.main:app",
         "--host", "127.0.0.1", "--port", str(args.api_port)],
        cwd=ROOT,
    )
    web_env = dict(os.environ)
    web_env["VITE_API_PROXY"] = f"http://127.0.0.1:{args.api_port}"
    web = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(args.web_port)],
        cwd=WEB_DIR, env=web_env,
    )

    def stop(*_a):
        print("\nStopping servers...")
        for p in (web, api):
            try:
                p.terminate()
            except Exception:
                pass
        raise SystemExit(0)

    signal.signal(signal.SIGINT, stop)
    try:
        signal.signal(signal.SIGTERM, stop)
    except Exception:
        pass

    print("Waiting for API...", flush=True)
    if not wait_for(f"{api_url}/api/health"):
        stop()
    print("Waiting for web app...", flush=True)
    if not wait_for(web_url):
        stop()

    print()
    print(f"  DineIQ is running:  {web_url}")
    print(f"  API health:         {api_url}/api/health")
    print("  Login:              admin / DineIQ-Admin-123")
    print()
    if not args.no_browser:
        try:
            webbrowser.open(web_url)
        except Exception:
            pass
    try:
        while True:
            time.sleep(1)
            for p, name in ((api, "API"), (web, "web")):
                if p.poll() is not None:
                    print(f"{name} server exited (code {p.returncode}). Stopping.")
                    stop()
    except SystemExit:
        pass


if __name__ == "__main__":
    main()
