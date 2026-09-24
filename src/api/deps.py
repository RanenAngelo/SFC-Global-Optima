"""API dependencies: JWT auth, RBAC, audit, shared SQL filter builder
(SRS FR i–ii/lxiii, Step 48 filters).
"""
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt as _bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config.settings import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET  # noqa: E402
from src.common import db as dbmod  # noqa: E402
from src.common.models import AuditLog, User  # noqa: E402

class _Pwd:
    @staticmethod
    def hash(pw: str) -> str:
        return _bcrypt.hashpw(pw.encode()[:72], _bcrypt.gensalt()).decode()

    @staticmethod
    def verify(pw: str, hashed: str) -> bool:
        try:
            return _bcrypt.checkpw(pw.encode()[:72], hashed.encode())
        except Exception:  # noqa: BLE001
            return False


pwd = _Pwd()
bearer = HTTPBearer(auto_error=False)

ROLE_RANK = {"viewer": 1, "analyst": 2, "manager": 3, "admin": 4}


def create_token(username: str, role: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "role": role, "exp": exp},
                      JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if creds is None:
        raise HTTPException(401, "Login required")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
    s = dbmod.get_session()
    try:
        u = s.query(User).filter_by(username=payload.get("sub"), is_active=True).first()
    finally:
        s.close()
    if not u:
        raise HTTPException(401, "Unknown user")
    return {"username": u.username, "role": u.role}


def require_role(*roles):
    def check(user=Depends(get_current_user)):
        if user["role"] not in roles and not (
                len(roles) == 1 and ROLE_RANK[user["role"]] >= ROLE_RANK[roles[0]]):
            # single-role form means "this role or above"
            raise HTTPException(403, "Insufficient permissions")
        return user
    return check


def audit(username: str, action: str, detail: str = ""):
    s = dbmod.get_session()
    try:
        s.add(AuditLog(username=username, action=action, detail=detail[:2000]))
        s.commit()
    finally:
        s.close()


class Filters(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    restaurant_id: Optional[str] = None
    category_id: Optional[str] = None
    item_id: Optional[str] = None
    channel: Optional[str] = None
    promotion_id: Optional[str] = None
    segment: Optional[str] = None
    performance_class: Optional[str] = None
    min_rating: Optional[float] = None


def get_filters(
    date_from: Optional[str] = Query(None), date_to: Optional[str] = Query(None),
    restaurant_id: Optional[str] = Query(None), category_id: Optional[str] = Query(None),
    item_id: Optional[str] = Query(None), channel: Optional[str] = Query(None),
    promotion_id: Optional[str] = Query(None), segment: Optional[str] = Query(None),
    performance_class: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None),
) -> Filters:
    return Filters(date_from=date_from, date_to=date_to, restaurant_id=restaurant_id,
                   category_id=category_id, item_id=item_id, channel=channel,
                   promotion_id=promotion_id, segment=segment,
                   performance_class=performance_class, min_rating=min_rating)


def fact_where(f: Filters, alias: str = "f") -> tuple[str, dict]:
    """Build a parameterized WHERE clause over fact_order_lines (+ joins)."""
    conds, params = ["status = 'Completed'"], {}
    if f.date_from:
        conds.append(f"date({alias}.order_datetime) >= :date_from")
        params["date_from"] = f.date_from
    if f.date_to:
        conds.append(f"date({alias}.order_datetime) <= :date_to")
        params["date_to"] = f.date_to
    for attr, col in [("restaurant_id", "restaurant_id"), ("category_id", "category_id"),
                      ("item_id", "item_id"), ("channel", "channel")]:
        v = getattr(f, attr)
        if v:
            conds.append(f"{alias}.{col} = :{attr}")
            params[attr] = v
    if f.promotion_id:
        conds.append(f"({alias}.line_promotion_id = :promotion_id OR "
                     f"{alias}.order_promotion_id = :promotion_id)")
        params["promotion_id"] = f.promotion_id
    return " AND ".join(conds), params


def q(sql: str, params: dict | None = None):
    with dbmod.engine.connect() as con:
        rows = con.execute(text(sql), params or {}).mappings().all()
        return [dict(r) for r in rows]
