import asyncio
import json
import os
import shutil
import tempfile
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])

VALID_CATEGORIES = {"food", "transport", "accommodation", "activities", "other"}

RECEIPT_SCHEMA = json.dumps({
    "type": "object",
    "properties": {
        "title":    {"type": ["string", "null"]},
        "amount":   {"type": ["number", "null"]},
        "currency": {"type": ["string", "null"]},
        "date":     {"type": ["string", "null"]},
        "category": {"type": "string", "enum": list(VALID_CATEGORIES)},
        "notes":    {"type": ["string", "null"]},
    },
    "required": ["title", "amount", "currency", "date", "category", "notes"],
})


CATEGORY_SCHEMA = json.dumps({
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": list(VALID_CATEGORIES)},
    },
    "required": ["category"],
})


class CategoryRequest(BaseModel):
    title: str


class CategoryResponse(BaseModel):
    category: str


@router.post("/suggest-category", response_model=CategoryResponse)
async def suggest_category(
    body: CategoryRequest,
    current_user: User = Depends(get_current_user),
):
    if not body.title or len(body.title.strip()) < 3:
        return CategoryResponse(category="other")

    try:
        claude = _claude_path()
    except FileNotFoundError:
        return CategoryResponse(category="other")

    prompt = (
        f'Categorise this expense title: "{body.title.strip()}"\n'
        "Pick exactly one of: food, transport, accommodation, activities, other.\n"
        "food = restaurants, groceries, drinks. transport = flights, taxis, fuel, trains. "
        "accommodation = hotels, rentals, hostels. activities = tickets, tours, sports, entertainment. "
        "other = everything else."
    )

    proc = await asyncio.create_subprocess_exec(
        claude, "--print",
        "--model", "haiku",
        "--output-format", "json",
        "--json-schema", CATEGORY_SCHEMA,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(input=prompt.encode()), timeout=15)
    except asyncio.TimeoutError:
        proc.kill()
        return CategoryResponse(category="other")

    if proc.returncode != 0:
        return CategoryResponse(category="other")

    try:
        result = json.loads(stdout.decode())
        parsed = result.get("structured_output") or result
        category = parsed.get("category", "other")
        if category not in VALID_CATEGORIES:
            category = "other"
        return CategoryResponse(category=category)
    except (json.JSONDecodeError, KeyError):
        return CategoryResponse(category="other")


class ReceiptParseResponse(BaseModel):
    title:    str | None = None
    amount:   float | None = None
    currency: str | None = None
    date:     str | None = None
    category: str | None = None
    notes:    str | None = None


def _claude_path() -> str:
    found = shutil.which("claude")
    if found:
        return found
    # Fallback for nvm installs where PATH may not include node bin
    nvm_guess = os.path.expanduser("~/.nvm/versions/node/v20.19.3/bin/claude")
    if os.path.isfile(nvm_guess):
        return nvm_guess
    raise FileNotFoundError("claude CLI not found — is Claude Code installed?")


@router.post("/parse-receipt", response_model=ReceiptParseResponse)
async def parse_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large — max 10 MB")

    ext = (file.content_type or "image/jpeg").split("/")[-1] or "jpg"

    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        prompt = (
            f"Read the image at this exact file path: {tmp_path}\n\n"
            "It is a receipt. Extract the merchant name, total amount, currency, "
            "date, spending category, and any short useful notes. "
            "Translate all text to English if it is in another language. "
            "Return the result as JSON matching the provided schema."
        )

        try:
            claude = _claude_path()
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=str(e))

        proc = await asyncio.create_subprocess_exec(
            claude, "--print",
            "--model", "haiku",
            "--output-format", "json",
            "--json-schema", RECEIPT_SCHEMA,
            "--add-dir", tempfile.gettempdir(),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(input=prompt.encode()), timeout=60)
        except asyncio.TimeoutError:
            proc.kill()
            raise HTTPException(status_code=504, detail="Receipt parsing timed out — try again")

        if proc.returncode != 0:
            raise HTTPException(status_code=502, detail="Could not read the receipt — try a clearer photo")

        try:
            result = json.loads(stdout.decode())
            # --output-format json wraps in a result envelope; unwrap if needed
            if "result" in result:
                parsed = result["result"]
            else:
                parsed = result
        except (json.JSONDecodeError, KeyError):
            raise HTTPException(status_code=422, detail="Could not read the receipt — try a clearer photo")

    finally:
        os.unlink(tmp_path)

    category = parsed.get("category")
    if category not in VALID_CATEGORIES:
        category = "other"

    return ReceiptParseResponse(
        title=parsed.get("title") or None,
        amount=parsed.get("amount") or None,
        currency=parsed.get("currency") or None,
        date=parsed.get("date") or None,
        category=category,
        notes=parsed.get("notes") or None,
    )
