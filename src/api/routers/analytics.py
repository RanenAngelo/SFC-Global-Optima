"""Analytics read routes (SRS Steps 42–47 dashboards data, Step 48 filters).

Single source of truth: every KPI/chart/table reads these endpoints, which
compute live from the serving DB with caller-supplied filters.
"""
import sys
from pathlib import Path

from fastapi import APIRouter, Depends

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))
from src.api import deps  # noqa: E402

router = APIRouter()


@router.get("/dashboard/overview")
def overview(f: deps.Filters = Depends(deps.get_filters),
             user=Depends(deps.get_current_user)):
    w, p = deps.fact_where(f)
    kpi = deps.q(f"""SELECT COUNT(DISTINCT f.order_id) orders,
        ROUND(SUM(line_total),2) revenue, ROUND(SUM(line_margin),2) profit,
        ROUND(SUM(line_total)/COUNT(DISTINCT f.order_id),2) aov,
        COUNT(DISTINCT f.customer_id) customers FROM fact_order_lines f WHERE {w}""", p)[0]
    trend = deps.q(f"""SELECT date(order_datetime) d, ROUND(SUM(line_total),2) revenue,
        COUNT(DISTINCT order_id) orders FROM fact_order_lines f WHERE {w}
        GROUP BY 1 ORDER BY 1""", p)
    channels = deps.q(f"""SELECT channel, COUNT(DISTINCT order_id) orders,
        ROUND(SUM(line_total),2) revenue FROM fact_order_lines f WHERE {w}
        GROUP BY 1 ORDER BY revenue DESC""", p)
    top = deps.q(f"""SELECT item_id, item_name, SUM(quantity) units,
        ROUND(SUM(line_total),2) revenue FROM fact_order_lines f WHERE {w}
        GROUP BY 1,2 ORDER BY revenue DESC LIMIT 8""", p)
    cats = deps.q(f"""SELECT category_name, ROUND(SUM(line_total),2) revenue
        FROM fact_order_lines f WHERE {w} GROUP BY 1 ORDER BY revenue DESC""", p)
    waste = deps.q("SELECT ROUND(SUM(wasted_qty),1) qty, ROUND(SUM(wastage_cost),2) cost "
                   "FROM fact_wastage")[0]
    anoms = deps.q("SELECT COUNT(*) n FROM anomalies WHERE severity IN ('high','critical')")[0]["n"]
    recs = deps.q("SELECT COUNT(*) n FROM recommendations WHERE priority = 'Critical'")[0]["n"]
    return {"kpi": kpi, "revenue_trend": trend, "channels": channels,
            "top_sellers": top, "category_revenue": cats, "wastage": waste,
            "open_critical_anomalies": anoms, "critical_recommendations": recs}


@router.get("/menu-intelligence")
def menu_intel(f: deps.Filters = Depends(deps.get_filters),
               user=Depends(deps.get_current_user)):
    if f.restaurant_id:  # location-specific classes (Step 34)
        rows = deps.q("""SELECT l.*, m.item_name FROM location_menu_class l
            JOIN (SELECT DISTINCT item_id, item_name FROM menu_classified) m
            ON l.item_id = m.item_id WHERE l.restaurant_id = :r
            ORDER BY l.revenue DESC""", {"r": f.restaurant_id})
        return {"scope": "location", "rows": rows,
                "classes": deps.q("SELECT location_class class, COUNT(*) n FROM "
                                  "location_menu_class WHERE restaurant_id = :r GROUP BY 1",
                                  {"r": f.restaurant_id})}
    w, p = deps.fact_where(f)
    live = {r["item_id"]: r for r in deps.q(
        f"""SELECT item_id, SUM(quantity) units, ROUND(SUM(line_total),2) revenue,
        ROUND(SUM(line_margin),2) margin FROM fact_order_lines f WHERE {w} GROUP BY 1""", p)}
    rows = deps.q("SELECT * FROM menu_classified")
    for r in rows:
        lv = live.get(r["item_id"], {})
        r["f_units"] = lv.get("units", 0)
        r["f_revenue"] = lv.get("revenue", 0)
        r["f_margin"] = lv.get("margin", 0)
    return {"scope": "global", "rows": rows,
            "classes": deps.q("SELECT performance_class class, COUNT(*) n FROM "
                              "menu_classified GROUP BY 1")}


@router.get("/menu-intelligence/{item_id}")
def menu_item_detail(item_id: str, user=Depends(deps.get_current_user)):
    base = deps.q("SELECT * FROM menu_classified WHERE item_id = :i", {"i": item_id})
    if not base:
        from fastapi import HTTPException
        raise HTTPException(404, "Item not found")
    trend = deps.q("""SELECT substr(order_datetime,1,7) m, SUM(quantity) units,
        ROUND(SUM(line_total),2) revenue FROM fact_order_lines
        WHERE item_id = :i AND status='Completed' GROUP BY 1 ORDER BY 1""", {"i": item_id})
    locs = deps.q("""SELECT l.*, r.restaurant_name, r.city FROM location_menu_class l
        JOIN restaurants r ON l.restaurant_id = r.restaurant_id
        WHERE l.item_id = :i ORDER BY l.revenue DESC""", {"i": item_id})
    elas = deps.q("SELECT * FROM price_elasticity WHERE item_id = :i", {"i": item_id})
    slow = deps.q("SELECT slow_moving, signals FROM slow_movers WHERE item_id = :i",
                  {"i": item_id})
    channels = deps.q("""SELECT channel, SUM(quantity) units, COUNT(*) lines,
        ROUND(SUM(line_total),2) revenue FROM fact_order_lines
        WHERE item_id = :i AND status='Completed' GROUP BY 1 ORDER BY 2 DESC""",
                      {"i": item_id})
    price_hist = deps.q("SELECT price, effective_from, effective_to FROM pricing_history "
                        "WHERE item_id = :i ORDER BY effective_from", {"i": item_id})
    rating_dist = deps.q("SELECT rating, COUNT(*) n FROM ratings WHERE item_id = :i "
                         "GROUP BY 1 ORDER BY 1", {"i": item_id})
    return {"item": base[0], "monthly_trend": trend, "locations": locs,
            "elasticity": elas, "slow": slow[0] if slow else None,
            "channels": channels, "price_history": price_hist,
            "rating_dist": rating_dist}


@router.get("/customers/analytics")
def customer_analytics(user=Depends(deps.get_current_user)):
    return {
        "segments": deps.q("SELECT segment, COUNT(*) n, ROUND(AVG(monetary),2) avg_value, "
                            "ROUND(SUM(monetary),2) total_value FROM customer_segments GROUP BY 1"),
        "rfm": deps.q("SELECT R, F, M, COUNT(*) n FROM customer_segments GROUP BY 1,2,3"),
        "high_value": deps.q("SELECT * FROM customer_segments WHERE segment = "
                              "'High-Value Loyal Customers' ORDER BY monetary DESC LIMIT 20"),
        "at_risk": deps.q("SELECT c.*, ch.band churn_band FROM customer_segments c JOIN churn_risk ch "
                           "USING (customer_id) WHERE c.segment = 'At-Risk Customers' "
                           "ORDER BY ch.score DESC LIMIT 20"),
        "churn_bands": deps.q("SELECT band, COUNT(*) n FROM churn_risk GROUP BY 1"),
        "trends": deps.q("SELECT substr(order_datetime,1,7) m, COUNT(DISTINCT customer_id) active "
                          "FROM fact_order_lines WHERE status='Completed' GROUP BY 1 ORDER BY 1"),
    }


@router.get("/market-basket")
def basket(min_lift: float = 1.0, limit: int = 50, user=Depends(deps.get_current_user)):
    rules = deps.q("SELECT r.*, m1.item_name ant_name, m2.item_name con_name FROM "
                    "(SELECT *, substr(antecedent,1,5) a1 FROM basket_rules) r "
                    "LEFT JOIN menu_items m1 ON r.antecedent = m1.item_id "
                    "LEFT JOIN menu_items m2 ON r.consequent = m2.item_id "
                    "WHERE lift >= :l ORDER BY lift DESC LIMIT :n",
                    {"l": min_lift, "n": limit})
    return {"rules": rules,
            "bundles": deps.q("SELECT * FROM basket_bundles"),
            "itemsets": deps.q("SELECT * FROM basket_itemsets ORDER BY support DESC LIMIT 20")}


@router.get("/forecast")
def forecast(grain: str = "item", entity_id: str | None = None,
             user=Depends(deps.get_current_user)):
    if grain not in ("item", "category", "restaurant", "item_x_restaurant"):
        from fastapi import HTTPException
        raise HTTPException(400, "Bad grain")
    fc = deps.q("SELECT * FROM forecasts WHERE grain = :g AND (:e IS NULL OR entity_id = :e) "
                "ORDER BY entity_id, date", {"g": grain, "e": entity_id})
    acc = deps.q("SELECT task, metrics FROM model_registry WHERE task = 'demand_forecast'")
    return {"forecasts": fc[:5000], "model_metrics": acc,
            "note": "For actual-vs-predicted history see /api/forecast/history"}


@router.get("/forecast/history")
def forecast_history(grain: str = "restaurant", entity_id: str | None = None,
                     user=Depends(deps.get_current_user)):
    if grain == "restaurant":
        sql = """SELECT restaurant_id entity, date(order_datetime) d, SUM(quantity) units
            FROM fact_order_lines WHERE status='Completed' AND (:e IS NULL OR restaurant_id = :e)
            GROUP BY 1,2 ORDER BY 2"""
    elif grain == "item":
        sql = """SELECT item_id entity, date(order_datetime) d, SUM(quantity) units
            FROM fact_order_lines WHERE status='Completed' AND (:e IS NULL OR item_id = :e)
            GROUP BY 1,2 ORDER BY 2"""
    else:
        sql = """SELECT category_id entity, date(order_datetime) d, SUM(quantity) units
            FROM fact_order_lines WHERE status='Completed' AND (:e IS NULL OR category_id = :e)
            GROUP BY 1,2 ORDER BY 2"""
    return {"history": deps.q(sql, {"e": entity_id})}


@router.get("/inventory")
def inventory(user=Depends(deps.get_current_user)):
    return {
        "wastage_summary": deps.q("SELECT * FROM wastage_summary ORDER BY wastage_cost DESC LIMIT 30"),
        "wastage_risk": deps.q("SELECT * FROM wastage_risk ORDER BY risk_score DESC LIMIT 30"),
        "risk_bands": deps.q("SELECT risk_band, COUNT(*) n FROM wastage_risk GROUP BY 1"),
        "trend": deps.q("SELECT date d, SUM(wasted_qty) qty, SUM(wastage_cost) cost FROM "
                         "fact_wastage GROUP BY 1 ORDER BY 1"),
        "by_reason": deps.q("SELECT reason, SUM(wasted_qty) qty, SUM(wastage_cost) cost FROM "
                             "fact_wastage GROUP BY 1 ORDER BY cost DESC"),
        "by_location": deps.q("SELECT restaurant_id, city, SUM(wasted_qty) qty, SUM(wastage_cost) cost "
                               "FROM fact_wastage GROUP BY 1,2 ORDER BY cost DESC"),
        "stock": deps.q("SELECT restaurant_id, item_id, date, stock_level, consumed_qty, "
                         "replenished_qty FROM inventory ORDER BY date DESC LIMIT 200"),
    }


@router.get("/pricing")
def pricing(user=Depends(deps.get_current_user)):
    return {
        "elasticity": deps.q("SELECT e.*, m.item_name FROM price_elasticity e "
                              "LEFT JOIN menu_items m ON e.item_id = m.item_id"),
        "margin_by_item": deps.q("SELECT item_id, item_name, revenue, contribution_margin, "
                                  "profit_pct, units_sold FROM menu_classified ORDER BY "
                                  "contribution_margin DESC"),
        "history": deps.q("SELECT * FROM pricing_history ORDER BY item_id, effective_from"),
    }


@router.get("/promotions")
def promotions(user=Depends(deps.get_current_user)):
    return {"promotions": deps.q("SELECT * FROM promotions ORDER BY start_date DESC"),
            "effectiveness": deps.q("SELECT * FROM promo_effectiveness"),
            "traps": deps.q("SELECT * FROM promo_traps")}


@router.post("/promotions")
def create_promotion(body: dict, user=Depends(deps.require_role("manager"))):
    from src.common import db as dbmod
    from sqlalchemy import text as T
    s = dbmod.get_session()
    try:
        s.execute(T("INSERT INTO promotions (promotion_id, promotion_name, scope, target_id, "
                    "discount_pct, start_date, end_date, channel) VALUES "
                    "(:id,:n,:s,:t,:d,:a,:b,:c)"), {
                        "id": body["promotion_id"], "n": body["promotion_name"],
                        "s": body.get("scope", "Storewide"), "t": body.get("target_id", "ALL"),
                        "d": body["discount_pct"], "a": body["start_date"],
                        "b": body["end_date"], "c": body.get("channel", "All Channels")})
        s.commit()
    except Exception as e:  # noqa: BLE001
        s.rollback()
        from fastapi import HTTPException
        raise HTTPException(400, f"Could not create promotion: {e}")
    finally:
        s.close()
    deps.audit(user["username"], "promo_create", body.get("promotion_id", ""))
    return {"created": body.get("promotion_id")}


@router.get("/ratings")
def ratings(user=Depends(deps.get_current_user)):
    return {
        "distribution": deps.q("SELECT rating, COUNT(*) n FROM ratings GROUP BY 1 ORDER BY 1"),
        "trend": deps.q("SELECT substr(review_date,1,7) m, ROUND(AVG(rating),2) avg_rating, "
                         "COUNT(*) n FROM ratings GROUP BY 1 ORDER BY 1"),
        "by_item": deps.q("SELECT * FROM rating_summary ORDER BY avg_rating DESC"),
        "by_location": deps.q("SELECT restaurant_id, ROUND(AVG(rating),2) avg_rating, COUNT(*) n "
                               "FROM ratings GROUP BY 1 ORDER BY avg_rating DESC"),
        "anomalies": deps.q("SELECT * FROM rating_anomalies"),
        "recent": deps.q("SELECT r.*, m.item_name FROM ratings r JOIN menu_items m "
                          "ON r.item_id = m.item_id ORDER BY r.review_date DESC LIMIT 50"),
    }


@router.get("/anomalies")
def anomalies(severity: str | None = None, category: str | None = None,
              limit: int = 200, user=Depends(deps.get_current_user)):
    conds, params = [], {"n": limit}
    if severity:
        conds.append("severity = :s")
        params["s"] = severity
    if category:
        conds.append("category = :c")
        params["c"] = category
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    return {"rows": deps.q(f"SELECT * FROM anomalies {where} ORDER BY timestamp DESC LIMIT :n",
                            params),
            "by_category": deps.q("SELECT category, COUNT(*) n FROM anomalies GROUP BY 1"),
            "by_severity": deps.q("SELECT severity, COUNT(*) n FROM anomalies GROUP BY 1")}


@router.get("/locations")
def locations(user=Depends(deps.get_current_user)):
    return deps.q("SELECT * FROM location_intelligence ORDER BY revenue DESC")


@router.get("/locations/{restaurant_id}")
def location_detail(restaurant_id: str, user=Depends(deps.get_current_user)):
    base = deps.q("SELECT * FROM location_intelligence WHERE restaurant_id = :r",
                  {"r": restaurant_id})
    if not base:
        from fastapi import HTTPException
        raise HTTPException(404, "Location not found")
    trend = deps.q("""SELECT date(order_datetime) d, ROUND(SUM(line_total),2) revenue
        FROM fact_order_lines WHERE restaurant_id = :r AND status='Completed'
        GROUP BY 1 ORDER BY 1""", {"r": restaurant_id})
    menu = deps.q("SELECT * FROM location_menu_class WHERE restaurant_id = :r ORDER BY revenue DESC",
                  {"r": restaurant_id})
    return {"location": base[0], "trend": trend, "menu": menu}
