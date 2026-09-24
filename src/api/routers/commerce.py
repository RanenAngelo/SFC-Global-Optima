"""Store + operations routes: public menu/order placement/tracking and
authenticated order ops, menu management (FR iii–xi), customers.
"""
import sys
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))
from src.api import deps, schemas  # noqa: E402
from src.common import db as dbmod  # noqa: E402

router = APIRouter()


# ---- public storefront -------------------------------------------------------
STORE_POLICY = {
    "currency": "USD",
    "currency_note": "Dataset-native currency; all figures in US dollars.",
    "delivery_fee": 2.99,
    "tax_rate": 0.05,
    "free_delivery_over": 40.0,
    "source": "config: branch fulfilment policy (edit STORE_POLICY in commerce.py)",
}


@router.get("/store/policy")
def store_policy():
    """Public fulfilment policy constants (config, not analytics)."""
    return STORE_POLICY


@router.get("/store/promotions")
def store_promotions():
    """Public offer-code list. Any code here is accepted at checkout and its
    discount_pct is applied by POST /store/orders (see place_order)."""
    return {"promotions": deps.q(
        "SELECT promotion_id, promotion_name, scope, target_id, discount_pct,"
        " start_date, end_date FROM promotions ORDER BY promotion_id")}


@router.get("/store/menu")
def store_menu(restaurant_id: str | None = None, category_id: str | None = None,
               q: str | None = None):
    conds, params = ["m.is_active = 1"], {}
    if category_id:
        conds.append("m.category_id = :cat")
        params["cat"] = category_id
    if q:
        conds.append("m.item_name LIKE :q")
        params["q"] = f"%{q}%"
    rows = deps.q(f"""SELECT m.item_id, m.item_name, m.category_id, c.category_name,
        m.base_price AS price, COALESCE(rt.avg_rating, 0) AS rating,
        COALESCE(rt.n, 0) AS ratings_count
        FROM menu_items m JOIN menu_categories c ON m.category_id = c.category_id
        LEFT JOIN (SELECT item_id, AVG(rating) avg_rating, COUNT(*) n FROM ratings GROUP BY 1) rt
          ON rt.item_id = m.item_id
        WHERE {' AND '.join(conds)} ORDER BY m.item_name""", params)
    promos = deps.q("SELECT * FROM promotions WHERE date('now') BETWEEN start_date AND end_date")
    return {"items": rows, "active_promotions": promos,
            "restaurants": deps.q("SELECT restaurant_id, restaurant_name, city FROM restaurants ORDER BY 1")}


@router.get("/store/menu/{item_id}")
def store_item(item_id: str):
    rows = deps.q("SELECT m.*, c.category_name FROM menu_items m "
                  "JOIN menu_categories c ON m.category_id = c.category_id "
                  "WHERE m.item_id = :i", {"i": item_id})
    if not rows:
        raise HTTPException(404, "Item not found")
    pairs = deps.q("SELECT * FROM basket_rules WHERE antecedent = :i OR consequent = :i "
                   "ORDER BY lift DESC LIMIT 5", {"i": item_id})
    ratings = deps.q("SELECT rating, COUNT(*) n FROM ratings WHERE item_id = :i GROUP BY 1", {"i": item_id})
    return {"item": rows[0], "pairs_with": pairs, "rating_dist": ratings}


@router.post("/store/orders")
def place_order(body: schemas.OrderCreate):
    if not body.lines:
        raise HTTPException(400, "Empty basket")
    s = dbmod.get_session()
    try:
        rest = s.execute(text("SELECT restaurant_id FROM restaurants WHERE restaurant_id = :r"),
                         {"r": body.restaurant_id}).first()
        if not rest:
            raise HTTPException(400, "Unknown restaurant")
        cust = body.customer_id
        if cust:
            ok = s.execute(text("SELECT customer_id FROM customers WHERE customer_id = :c"),
                           {"c": cust}).first()
            if not ok:
                raise HTTPException(400, "Unknown customer")
        else:  # guest checkout -> lightweight customer record (anonymized, FR vi)
            cust = f"GUEST{datetime.now().strftime('%Y%m%d%H%M%S%f')}"[:16]
            s.execute(text("INSERT INTO customers (customer_id, home_city, signup_date, "
                           "preferred_channel) VALUES (:c, 'Unknown', date('now'), :ch)"),
                      {"c": cust, "ch": body.channel})
        disc = 0.0
        if body.promotion_id:
            pr = s.execute(text("SELECT discount_pct FROM promotions WHERE promotion_id = :p"),
                           {"p": body.promotion_id}).first()
            if not pr:
                raise HTTPException(400, "Unknown promotion")
            disc = float(pr[0])
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        n = s.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0
        oid = f"ORD{(9000000 + n + 1):07d}"
        total, li_rows = 0.0, []
        for i, ln in enumerate(body.lines):
            it = s.execute(text("SELECT base_price FROM menu_items WHERE item_id = :i "
                                "AND is_active = 1"), {"i": ln.item_id}).first()
            if not it:
                raise HTTPException(400, f"Item unavailable: {ln.item_id}")
            price = float(it[0])
            line_total = round(ln.quantity * price * (1 - disc), 2)
            total += line_total
            li_rows.append((f"OIWEB{i:05d}{n % 100000:05d}"[:12], oid, ln.item_id,
                            ln.quantity, price, disc, body.promotion_id, line_total))
        s.execute(text("INSERT INTO orders (order_id, customer_id, restaurant_id, "
                       "order_datetime, channel, promotion_id, status, total_amount) "
                       "VALUES (:o, :c, :r, :d, :ch, :p, 'Completed', :t)"),
                  {"o": oid, "c": cust, "r": body.restaurant_id, "d": now,
                   "ch": body.channel, "p": body.promotion_id, "t": round(total, 2)})
        for r in li_rows:
            s.execute(text("INSERT INTO order_items (order_item_id, order_id, item_id, "
                           "quantity, unit_price, discount_pct, promotion_id, line_total) "
                           "VALUES (:a,:b,:c,:d,:e,:f,:g,:h)"),
                      {"a": r[0], "b": r[1], "c": r[2], "d": r[3], "e": r[4],
                       "f": r[5], "g": r[6], "h": r[7]})
        s.commit()
        return {"order_id": oid, "customer_id": cust, "total": round(total, 2),
                "note": "Analytics refresh on next pipeline run (POST /api/admin/refresh)."}
    except HTTPException:
        s.rollback()
        raise
    finally:
        s.close()


@router.get("/store/orders/{order_id}")
def track_order(order_id: str):
    head = deps.q("SELECT o.*, r.restaurant_name FROM orders o JOIN restaurants r "
                  "ON o.restaurant_id = r.restaurant_id WHERE o.order_id = :o", {"o": order_id})
    if not head:
        raise HTTPException(404, "Order not found")
    lines = deps.q("SELECT oi.*, m.item_name FROM order_items oi JOIN menu_items m "
                   "ON oi.item_id = m.item_id WHERE oi.order_id = :o", {"o": order_id})
    return {"order": head[0], "lines": lines}


# ---- authenticated ops ----------------------------------------------------------
@router.get("/orders")
def list_orders(page: int = 1, page_size: int = 20, status: str | None = None,
                f: deps.Filters = Depends(deps.get_filters),
                user=Depends(deps.get_current_user)):
    # orders table only carries date/restaurant/channel/status — apply those.
    conds, params = ["1=1"], {}
    if f.date_from:
        conds.append("date(o.order_datetime) >= :date_from")
        params["date_from"] = f.date_from
    if f.date_to:
        conds.append("date(o.order_datetime) <= :date_to")
        params["date_to"] = f.date_to
    if f.restaurant_id:
        conds.append("o.restaurant_id = :restaurant_id")
        params["restaurant_id"] = f.restaurant_id
    if f.channel:
        conds.append("o.channel = :channel")
        params["channel"] = f.channel
    if status:
        conds.append("o.status = :st")
        params["st"] = status
    where = " AND ".join(conds)
    total = deps.q(f"SELECT COUNT(*) n FROM orders o WHERE {where}", params)[0]["n"]
    rows = deps.q(f"""SELECT o.*, r.restaurant_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) AS lines_n,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id = o.order_id) AS items_qty
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.restaurant_id WHERE {where}
        ORDER BY o.order_datetime DESC LIMIT :lim OFFSET :off""",
                  {**params, "lim": page_size, "off": (page - 1) * page_size})
    return {"rows": rows, "total": total, "page": page, "page_size": page_size}


@router.get("/orders/{order_id}")
def order_detail(order_id: str, user=Depends(deps.get_current_user)):
    return track_order(order_id)


@router.patch("/orders/{order_id}")
def update_order(order_id: str, body: schemas.OrderStatusUpdate,
                 user=Depends(deps.require_role("manager"))):
    if body.status not in ("Completed", "Cancelled"):
        raise HTTPException(400, "Bad status")
    s = dbmod.get_session()
    try:
        r = s.execute(text("UPDATE orders SET status = :s WHERE order_id = :o"),
                      {"s": body.status, "o": order_id})
        s.commit()
        if not r.rowcount:
            raise HTTPException(404, "Order not found")
    finally:
        s.close()
    deps.audit(user["username"], "order_status", f"{order_id}->{body.status}")
    return {"order_id": order_id, "status": body.status}


@router.get("/menu/items")
def menu_items(user=Depends(deps.get_current_user)):
    return deps.q("SELECT m.*, c.category_name FROM menu_items m "
                  "JOIN menu_categories c ON m.category_id = c.category_id ORDER BY m.item_name")


@router.patch("/menu/items/{item_id}")
def set_availability(item_id: str, body: schemas.MenuAvailability,
                     user=Depends(deps.require_role("manager"))):
    s = dbmod.get_session()
    try:
        r = s.execute(text("UPDATE menu_items SET is_active = :a WHERE item_id = :i"),
                      {"a": int(body.is_active), "i": item_id})
        s.commit()
        if not r.rowcount:
            raise HTTPException(404, "Item not found")
    finally:
        s.close()
    deps.audit(user["username"], "menu_availability", f"{item_id}={body.is_active}")
    return {"item_id": item_id, "is_active": body.is_active}


@router.post("/menu/items/{item_id}/price")
def update_price(item_id: str, body: schemas.MenuPriceUpdate,
                 user=Depends(deps.require_role("manager"))):
    s = dbmod.get_session()
    try:
        cur = s.execute(text("SELECT base_price FROM menu_items WHERE item_id = :i"),
                        {"i": item_id}).first()
        if not cur:
            raise HTTPException(404, "Item not found")
        today = datetime.now().strftime("%Y-%m-%d")
        s.execute(text("UPDATE pricing_history SET effective_to = :t WHERE item_id = :i "
                       "AND effective_to IS NULL"), {"t": today, "i": item_id})
        n = s.execute(text("SELECT COUNT(*) FROM pricing_history")).scalar() or 0
        s.execute(text("INSERT INTO pricing_history (price_id, item_id, price, effective_from) "
                       "VALUES (:p, :i, :v, :t)"),
                  {"p": f"PWEB{n + 1:06d}", "i": item_id, "v": body.new_price, "t": today})
        s.execute(text("UPDATE menu_items SET base_price = :v WHERE item_id = :i"),
                  {"v": body.new_price, "i": item_id})
        s.commit()
    finally:
        s.close()
    deps.audit(user["username"], "price_update", f"{item_id} {cur[0]}->{body.new_price}")
    return {"item_id": item_id, "old_price": cur[0], "new_price": body.new_price}


@router.get("/customers")
def list_customers(page: int = 1, page_size: int = 20, segment: str | None = None,
                   q: str | None = None, user=Depends(deps.get_current_user)):
    conds, params = [], {}
    if segment:
        conds.append("segment = :seg")
        params["seg"] = segment
    if q:
        conds.append("customer_id LIKE :q")
        params["q"] = f"%{q}%"
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    total = deps.q(f"SELECT COUNT(*) n FROM customer_segments {where}", params)[0]["n"]
    rows = deps.q(f"SELECT * FROM customer_segments {where} ORDER BY monetary DESC "
                  "LIMIT :lim OFFSET :off", {**params, "lim": page_size,
                                             "off": (page - 1) * page_size})
    return {"rows": rows, "total": total, "page": page, "page_size": page_size}


@router.get("/customers/{customer_id}")
def customer_detail(customer_id: str, user=Depends(deps.get_current_user)):
    seg = deps.q("SELECT * FROM customer_segments WHERE customer_id = :c", {"c": customer_id})
    if not seg:
        raise HTTPException(404, "Customer not found")
    orders = deps.q("SELECT * FROM orders WHERE customer_id = :c ORDER BY order_datetime DESC "
                    "LIMIT 20", {"c": customer_id})
    churn = deps.q("SELECT * FROM churn_risk WHERE customer_id = :c", {"c": customer_id})
    return {"profile": seg[0], "recent_orders": orders,
            "churn": churn[0] if churn else None}
