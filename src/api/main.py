"""DineIQ Analytics API (FastAPI). Run: uvicorn src.api.main:app --host 0.0.0.0 --port 8000"""
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.api.routers import analytics, commerce, core, decisions  # noqa: E402

app = FastAPI(title="DineIQ Analytics API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(Exception)
async def api_errors(request: Request, exc: Exception):
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    return JSONResponse({"detail": f"{type(exc).__name__}: {exc}"}, status_code=500)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "dineiq-api"}


# analytics BEFORE commerce so /customers/analytics wins over /customers/{id}
app.include_router(core.router, prefix="/api", tags=["core"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(commerce.router, prefix="/api", tags=["commerce"])
app.include_router(decisions.router, prefix="/api", tags=["decisions"])
