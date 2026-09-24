"""Decision routes: recommendations (Steps 37–39), what-if (Steps 40–41),
dual-pipeline comparison (Step 47), downloadable reports (Step 49),
CSV/Excel export (Step 50, RBAC-gated).
"""
import io
import json
import sys
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text as T

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))
from config.settings import REPORTS_DIR  # noqa: E402
from src.api import deps, schemas  # noqa: E402
from src.common import db as dbmod  # noqa: E402

router = APIRouter()


@router.get("/recommendations")
def recommendations(priority: str | None = None, type: str | None = None,
                    user=Depends(deps.get_current_user)):
    conds, params = [], {}
    if priority:
        conds.append("r.priority = :p")
        params["p"] = priority
    if type:
        conds.append("r.type = :t")
        params["t"] = type
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    rows = deps.q(f"""SELECT r.*, COALESCE(s.state,'new') state FROM recommendations r
        LEFT JOIN recommendation_state s ON r.id = s.rec_id {where}
        ORDER BY CASE priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2 ELSE 3 END, impact_rs DESC""", params)
    for r in rows:
        try:
            r["evidence"] = json.loads(r["evidence"]) if isinstance(r["evidence"], str) else r["evidence"]
        except Exception:  # noqa: BLE001
            pass
    return rows


@router.patch("/recommendations/{rec_id}")
def rec_state(rec_id: str, body: schemas.RecStateUpdate,
              user=Depends(deps.require_role("analyst"))):
    if body.state not in ("new", "saved", "dismissed", "done"):
        raise HTTPException(400, "Bad state")
    s = dbmod.get_session()
    try:
        s.execute(T("INSERT INTO recommendation_state (rec_id, state, username) VALUES "
                    "(:r,:s,:u) ON CONFLICT(rec_id) DO UPDATE SET state=:s, username=:u"),
                  {"r": rec_id, "s": body.state, "u": user["username"]})
        s.commit()
    finally:
        s.close()
    return {"rec_id": rec_id, "state": body.state}


@router.post("/whatif")
def whatif(body: schemas.WhatIfIn, user=Depends(deps.require_role("analyst"))):
    from python_pipeline import whatif as W
    try:
        if body.scenario == "price":
            if body.new_price is None:
                raise HTTPException(400, "new_price required")
            out = W.scenario_price(body.item_id, body.new_price)
        elif body.scenario == "discount":
            if body.discount_pct is None:
                raise HTTPException(400, "discount_pct required")
            out = W.scenario_discount(body.item_id, body.discount_pct, body.days)
        elif body.scenario == "remove":
            out = W.scenario_remove(body.item_id)
        elif body.scenario == "prep_cut":
            if body.cut_pct is None:
                raise HTTPException(400, "cut_pct required")
            out = W.scenario_prep_cut(body.item_id, body.cut_pct)
        elif body.scenario == "demand":
            if body.demand_pct is None:
                raise HTTPException(400, "demand_pct required")
            out = W.scenario_demand(body.item_id, body.demand_pct)
        else:
            raise HTTPException(400, "Unknown scenario")
    except IndexError:
        raise HTTPException(404, "Item not found")
    deps.audit(user["username"], "whatif", f"{body.scenario}:{body.item_id}")
    return out


@router.get("/comparison")
def comparison(limit: int = 200, user=Depends(deps.get_current_user)):
    summary = json.loads((REPORTS_DIR / "dual_pipeline_comparison.json").read_text())
    cust = pd.read_csv(REPORTS_DIR / "dual_compare_customer.csv").head(limit)
    dem = pd.read_csv(REPORTS_DIR / "dual_compare_demand.csv").head(limit)
    cust = cust.where(pd.notnull(cust), None).to_dict("records")
    dem = dem.where(pd.notnull(dem), None).to_dict("records")
    return {"summary": summary, "customer_rows": cust, "demand_rows": dem}


REPORT_QUERIES = {
    "menu_performance": "SELECT * FROM menu_classified",
    "profitability": "SELECT item_id, item_name, revenue, cost, contribution_margin, profit_pct FROM menu_classified",
    "customer_segmentation": "SELECT * FROM customer_segments",
    "market_basket": "SELECT * FROM basket_rules",
    "demand_forecast": "SELECT * FROM forecasts",
    "wastage": "SELECT * FROM wastage_summary",
    "promotions": "SELECT * FROM promo_effectiveness",
    "pricing": "SELECT * FROM price_elasticity",
    "location_performance": "SELECT * FROM location_intelligence",
    "anomalies": "SELECT * FROM anomalies",
    "recommendations": "SELECT * FROM recommendations",
    "model_comparison": None,  # served from CSV evidence files
}


@router.get("/reports")
def list_reports(user=Depends(deps.get_current_user)):
    files = sorted(p.name for p in REPORTS_DIR.glob("*.json"))
    return {"datasets": list(REPORT_QUERIES), "files": files}


@router.get("/reports/{name}")
def get_report(name: str, limit: int = 500, user=Depends(deps.get_current_user)):
    if name == "model_comparison":
        return {"customer": pd.read_csv(REPORTS_DIR / "dual_compare_customer.csv").head(limit).to_dict("records"),
                "demand": pd.read_csv(REPORTS_DIR / "dual_compare_demand.csv").head(limit).to_dict("records")}
    if name not in REPORT_QUERIES:
        raise HTTPException(404, "Unknown report")
    return deps.q(f"{REPORT_QUERIES[name]} LIMIT :n", {"n": min(limit, 5000)})


@router.get("/export/{name}.csv")
def export_csv(name: str, user=Depends(deps.require_role("manager"))):
    if name == "model_comparison":
        raise HTTPException(400, "Export customer/demand evidence separately")
    if name not in REPORT_QUERIES:
        raise HTTPException(404, "Unknown dataset")
    df = pd.read_sql(REPORT_QUERIES[name], dbmod.engine)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    deps.audit(user["username"], "export_csv", name)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={name}.csv"})


@router.get("/export/{name}.xlsx")
def export_xlsx(name: str, user=Depends(deps.require_role("manager"))):
    if name not in REPORT_QUERIES or REPORT_QUERIES[name] is None:
        raise HTTPException(404, "Unknown dataset")
    df = pd.read_sql(REPORT_QUERIES[name], dbmod.engine)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, sheet_name=name[:31])
    buf.seek(0)
    deps.audit(user["username"], "export_xlsx", name)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument."
                             "spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename={name}.xlsx"})
