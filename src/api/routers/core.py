"""Core routes: auth (FR i–ii), filter metadata (Step 48), admin incl. users,
pipeline monitoring + refresh (FR lxv), DQ/cleaning evidence (Steps 4–5).
"""
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))
from config.settings import REPORTS_DIR, ROOT  # noqa: E402
from src.api import deps, schemas  # noqa: E402
from src.common import db as dbmod  # noqa: E402
from src.common.models import AuditLog, PipelineRun, User  # noqa: E402

router = APIRouter()


@router.post("/auth/login", response_model=schemas.LoginOut)
def login(body: schemas.LoginIn):
    s = dbmod.get_session()
    try:
        u = s.query(User).filter_by(username=body.username, is_active=True).first()
        if not u or not deps.pwd.verify(body.password, u.password_hash):
            raise HTTPException(401, "Invalid credentials")
        deps.audit(u.username, "login", "web login")
        return {"access_token": deps.create_token(u.username, u.role),
                "username": u.username, "role": u.role}
    finally:
        s.close()


@router.get("/auth/me", response_model=schemas.UserOut)
def me(user=Depends(deps.get_current_user)):
    return {"username": user["username"], "role": user["role"], "is_active": True}


@router.get("/meta/filter-options")
def filter_options(user=Depends(deps.get_current_user)):
    return {
        "restaurants": deps.q("SELECT restaurant_id, restaurant_name, city FROM restaurants ORDER BY restaurant_id"),
        "categories": deps.q("SELECT category_id, category_name FROM menu_categories ORDER BY category_id"),
        "items": deps.q("SELECT item_id, item_name, category_id FROM menu_items WHERE is_active ORDER BY item_name"),
        "channels": [r["channel"] for r in deps.q("SELECT DISTINCT channel FROM orders ORDER BY 1")],
        "promotions": deps.q("SELECT promotion_id, promotion_name FROM promotions ORDER BY 1"),
        "segments": [r["segment"] for r in deps.q("SELECT DISTINCT segment FROM customer_segments ORDER BY 1")],
        "performance_classes": ["Profit Driver", "Volume Driver", "Hidden Opportunity", "Low Performer"],
        "date_range": deps.q("SELECT date(MIN(order_datetime)) dmin, date(MAX(order_datetime)) dmax FROM orders")[0],
    }


@router.get("/meta/model-registry")
def model_registry(user=Depends(deps.get_current_user)):
    return deps.q("SELECT * FROM model_registry ORDER BY trained_at DESC")


@router.get("/admin/users", response_model=list[schemas.UserOut])
def list_users(user=Depends(deps.require_role("admin"))):
    return [{"username": r["username"], "role": r["role"], "is_active": bool(r["is_active"])}
            for r in deps.q("SELECT username, role, is_active FROM users ORDER BY username")]


@router.post("/admin/users", response_model=schemas.UserOut)
def create_user(body: schemas.UserCreate, user=Depends(deps.require_role("admin"))):
    if body.role not in ("admin", "manager", "analyst", "viewer"):
        raise HTTPException(400, "Invalid role")
    s = dbmod.get_session()
    try:
        if s.query(User).filter_by(username=body.username).first():
            raise HTTPException(400, "Username exists")
        s.add(User(username=body.username, password_hash=deps.pwd.hash(body.password),
                   role=body.role))
        s.commit()
    finally:
        s.close()
    deps.audit(user["username"], "user_create", body.username)
    return {"username": body.username, "role": body.role, "is_active": True}


@router.get("/admin/audit")
def audit_log(limit: int = 100, user=Depends(deps.require_role("manager"))):
    return deps.q("SELECT * FROM audit_log ORDER BY id DESC LIMIT :n", {"n": min(limit, 500)})


@router.get("/admin/pipeline-runs")
def pipeline_runs(user=Depends(deps.get_current_user)):
    return deps.q("SELECT * FROM pipeline_runs ORDER BY id DESC LIMIT 50")


@router.get("/admin/data-quality")
def data_quality(user=Depends(deps.get_current_user)):
    out = {}
    for name in ["data_quality_report.json", "cleaning_report.json",
                 "dataset_statistics.json", "spark_ingest_report.json",
                 "integration_report.json"]:
        p = REPORTS_DIR / name
        out[name] = json.loads(p.read_text()) if p.exists() else None
    return out


def _run_refresh(spark: bool, username: str):
    s = dbmod.get_session()
    run = PipelineRun(pipeline="all" if spark else "python", stage="refresh",
                      status="started")
    s.add(run)
    s.commit()
    rid = run.id
    s.close()
    try:
        script = str(ROOT / "scripts" / "run_all.sh")
        r = subprocess.run(["bash", script] + (["--spark"] if spark else []),
                           capture_output=True, text=True, timeout=1800, cwd=str(ROOT))
        status, msg = ("success", r.stdout[-2000:]) if r.returncode == 0 else (
            "failed", (r.stdout + r.stderr)[-2000:])
    except Exception as e:  # noqa: BLE001
        status, msg = "failed", str(e)[:2000]
    s = dbmod.get_session()
    try:
        run = s.query(PipelineRun).get(rid)
        run.status, run.finished_at, run.message = status, datetime.utcnow(), msg
        s.commit()
        s.add(AuditLog(username=username, action="pipeline_refresh", detail=status))
        s.commit()
    finally:
        s.close()


@router.post("/admin/refresh")
def refresh(body: schemas.RefreshIn, bg: BackgroundTasks,
            user=Depends(deps.require_role("manager"))):
    bg.add_task(_run_refresh, body.spark, user["username"])
    return {"queued": True, "spark": body.spark}
