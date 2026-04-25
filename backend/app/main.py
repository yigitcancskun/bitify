from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .models import AnonymousSessionRequest, CheckinRequest, GenerateAvatarRequest, UploadResponse
from .store import Store
from .wiro import WiroClient, extract_output_url, extract_task_id, extract_task_status, task_failed

AVATAR_PROMPT = (
    "Create a stylized 3D cartoon full-body fitness avatar using BOTH front and back reference photos. "
    "Preserve identity strongly: face structure, hairline, body proportions, shoulder width, torso, arm and leg shape "
    "should closely resemble the real person. Keep it non-photorealistic cartoon style, game-like 3D character, "
    "black shorts, neutral standing pose, plain clean background, no text, no logos."
)

app = FastAPI(title="AI Fitness Avatar Evolution API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5555",
        "http://127.0.0.1:5555",
        "http://localhost:5556",
        "http://127.0.0.1:5556",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):555[0-9]",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store(settings: Settings = Depends(get_settings)) -> Store:
    return Store(settings)


def clean_username(value: str | None) -> str:
    if not value:
        return f"Shadow_{uuid4().hex[:5]}"
    cleaned = "".join(char for char in value.strip() if char.isalnum() or char in "_-")
    return cleaned[:24] or f"Shadow_{uuid4().hex[:5]}"


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    return {
        "ok": True,
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "wiro_configured": bool(settings.wiro_api_key),
    }


@app.post("/api/session/anonymous")
def create_anonymous_session(payload: AnonymousSessionRequest, store: Store = Depends(get_store)) -> dict:
    return store.create_profile(clean_username(payload.username))


@app.post("/api/avatar/upload", response_model=UploadResponse)
async def upload_avatar_sources(
    user_id: str = Form(...),
    front: UploadFile = File(...),
    back: UploadFile | None = File(None),
    store: Store = Depends(get_store),
) -> UploadResponse:
    front_url = await store.upload_photo(user_id, "front", front)
    back_url = await store.upload_photo(user_id, "back", back) if back else None
    return UploadResponse(front_url=front_url, back_url=back_url)


@app.post("/api/avatar/generate")
async def generate_avatar(
    payload: GenerateAvatarRequest,
    settings: Settings = Depends(get_settings),
    store: Store = Depends(get_store),
) -> dict:
    state = store.get_state(payload.user_id)
    current_avatar = state.get("current_avatar") or {}
    stats = current_avatar.get("stats")
    if payload.spend_credit:
        store.spend_credit(payload.user_id)

    wiro = WiroClient(settings)
    if not wiro.configured:
        raise HTTPException(status_code=503, detail="Wiro API key is missing. Real avatar generation requires WIRO_API_KEY.")

    try:
        result = await wiro.run_avatar(payload.front_url, payload.back_url, AVATAR_PROMPT)
    except Exception as exc:
        try:
            result = await wiro.run_avatar(payload.front_url, payload.back_url, AVATAR_PROMPT, use_fallback=True)
            result["primary_error"] = str(exc)
        except Exception as fallback_exc:
            raise HTTPException(status_code=502, detail=f"Wiro generation failed: {fallback_exc}") from fallback_exc

    task_id = extract_task_id(result)
    output_url = extract_output_url(result, {payload.front_url, payload.back_url or ""})
    if not task_id and not output_url:
        raise HTTPException(status_code=502, detail="Wiro did not return a task id or output URL.")
    version = store.create_avatar_version(
        user_id=payload.user_id,
        image_url=output_url,
        stats=stats or {"muscle": 24, "fat": 42, "posture": 50, "tone": 28},
        source_front_url=payload.front_url,
        source_back_url=payload.back_url,
        wiro_task_id=task_id,
        wiro_status="running" if task_id and not output_url else "completed",
        wiro_metadata=result,
    )
    return {"mode": "wiro", "task_id": task_id, "avatar_version": version, "state": store.get_state(payload.user_id)}


@app.get("/api/avatar/task/{task_id}")
async def get_avatar_task(
    task_id: str,
    settings: Settings = Depends(get_settings),
    store: Store = Depends(get_store),
) -> dict:
    wiro = WiroClient(settings)
    payload = await wiro.task_detail(task_id)
    existing = store.get_avatar_by_task(task_id)
    ignore_urls = {
        existing.get("source_front_url") if existing else "",
        existing.get("source_back_url") if existing else "",
    }
    output_url = extract_output_url(payload, ignore_urls)
    status = "failed" if task_failed(payload) else extract_task_status(payload)
    if output_url and status not in {"failed"}:
        status = "completed"
    elif status in {"completed", "task_postprocess_end", "task_end"} and not output_url:
        status = "failed"
    version = store.update_avatar_task(task_id, status, output_url, payload)
    user_id = version.get("user_id") if version else None
    state = store.get_state(user_id) if user_id else None
    return {"task_id": task_id, "status": status, "output_url": output_url, "avatar_version": version, "state": state}


@app.post("/api/checkins/today")
def submit_checkin(payload: CheckinRequest, store: Store = Depends(get_store)) -> dict:
    return store.apply_checkin(payload.user_id, payload.workout, payload.diet, payload.water_cups)


@app.get("/api/me/state")
def get_me_state(user_id: str, store: Store = Depends(get_store)) -> dict:
    return store.get_state(user_id)
