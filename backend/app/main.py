import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, trips, expenses, balances, notes, ai, ai_chat
from app.dependencies import warmup_jwks

logger = logging.getLogger("tripledger")


@asynccontextmanager
async def lifespan(app: FastAPI):
    warmup_jwks()
    yield


app = FastAPI(title="TripLedger API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all for unexpected errors. Runs outside the CORS middleware, so the
    browser would otherwise report a CORS failure instead of the real 500 —
    add the origin header manually for allowed origins.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    response = JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our side — please try again"},
    )
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origins_list:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(notes.router)
app.include_router(ai.router)
app.include_router(ai_chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
