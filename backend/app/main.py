from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, trips, expenses, balances, notes
from app.dependencies import warmup_jwks

app = FastAPI(title="TripLedger API", version="0.1.0")

@app.on_event("startup")
async def startup():
    warmup_jwks()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(notes.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
