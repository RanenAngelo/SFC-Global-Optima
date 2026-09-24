#!/usr/bin/env bash
# DineIQ: ensure Python runtime deps are installed (idempotent).
# Usage: bash scripts/ensure_env.sh
set -u
MISSING=$(python3 - <<'EOF'
mods = ["fastapi","uvicorn","sqlalchemy","pydantic","jose","passlib","pandas",
        "numpy","sklearn","scipy","pyspark","pyarrow","pytest","httpx",
        "openpyxl","jdk4py","multipart"]
missing = []
for m in mods:
    try:
        __import__(m)
    except Exception:
        missing.append(m)
print(" ".join(missing))
EOF
)
if [ -z "$MISSING" ]; then
  echo "ENV_OK: all deps present"
  exit 0
fi
echo "Installing missing: $MISSING"
pip install --user --break-system-packages --quiet \
  fastapi "uvicorn[standard]" sqlalchemy pydantic python-jose "passlib[bcrypt]" \
  python-multipart pandas numpy scikit-learn scipy "pyspark==3.5.*" pyarrow \
  pytest httpx openpyxl "jdk4py==17.0.9.2"
export JAVA_HOME=$(python3 -c "import jdk4py; print(jdk4py.JAVA_HOME)")
echo "ENV_READY JAVA_HOME=$JAVA_HOME"
$JAVA_HOME/bin/java -version 2>&1 | head -1
