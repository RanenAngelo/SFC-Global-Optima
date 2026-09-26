# Run DineIQ on your computer (localhost)

One command. Works on **Windows, macOS and Linux**. No Spark, Java or Docker needed
(the default build uses the pure-Python pipeline; Spark is optional — see below).

## 1. Install prerequisites (one time)

- **Python 3.10+** — https://www.python.org/downloads/
  (Windows: tick **“Add python.exe to PATH”** during install)
- **Node.js 18+** (includes npm) — https://nodejs.org

Check they exist:

```bash
python --version     # or: python3 --version
npm --version
```

## 2. Download the project

```bash
git clone -b arena/01a0d31c-sfc-global-optima https://github.com/RanenAngelo/SFC-Global-Optima.git
cd SFC-Global-Optima
```

(No git? Open that URL in a browser, switch to the
`arena/01a0d31c-sfc-global-optima` branch, **Code → Download ZIP**, unzip it.)

## 3. Start everything

```bash
python start_local.py
```

The first run takes a few minutes (installs packages, builds the analytics
database). Afterwards it starts in seconds. Your browser opens automatically at:

**http://localhost:5173**

## 4. Log in

| Username  | Password           | Role    |
|-----------|--------------------|---------|
| admin     | DineIQ-Admin-123   | admin   |
| manager   | DineIQ-Manager-123 | manager |
| analyst   | DineIQ-Analyst-123 | analyst |
| viewer    | DineIQ-Viewer-123  | viewer  |

Stop everything with **Ctrl+C** in the terminal.

## Change the URL / ports

```bash
python start_local.py --web-port 3000 --api-port 8001   # → http://localhost:3000
python start_local.py --no-browser                      # don't auto-open
```

## Optional: full dual-pipeline (Spark) rebuild

The app ships with the Spark-vs-Python comparison evidence prebuilt, so the
Model Comparison page works out of the box. To re-run Spark yourself:

```bash
bash scripts/run_all.sh --spark     # macOS / Linux / Git Bash
```

Windows note: Spark needs Java (auto-provided via `jdk4py`) **and**
`winutils.exe` with `HADOOP_HOME` set — easiest on Windows is
[WSL2](https://learn.microsoft.com/en-us/windows/wsl/) + Ubuntu.

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm: command not found` | Install Node 18+ and restart the terminal |
| `python: command not found` (mac/Linux) | Use `python3 start_local.py` |
| Port already in use | `python start_local.py --web-port 3001 --api-port 8001` |
| Blank page after login | Hard-refresh (Ctrl+Shift+R); check the terminal for errors |
| Rebuild data from scratch | Delete `database/dineiq.db` and re-run `python start_local.py` |
