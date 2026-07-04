import asyncio

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import jwt
from jwt import PyJWKClient
import ssl
import certifi

from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer()

_ssl_context = ssl.create_default_context(cafile=certifi.where())
_jwks_client = PyJWKClient(
    f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    ssl_context=_ssl_context,
    cache_keys=True,
)

def warmup_jwks():
    """Pre-fetch JWKS at startup so first login doesn't hang."""
    try:
        _jwks_client.fetch_data()
    except Exception:
        pass


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        # JWKS lookup does blocking network I/O on cold cache / key rotation —
        # run it off the event loop so it can't stall every other request
        signing_key = await asyncio.to_thread(_jwks_client.get_signing_key_from_jwt, token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256", "HS256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user_id: str | None = payload.get("sub")
    email: str = payload.get("email", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(id=user_id, email=email)
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            # Two concurrent first requests raced on the insert — the other one won
            await db.rollback()
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one()

    return user
