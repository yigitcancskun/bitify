import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .models import AnonymousSessionRequest, AuthRequest, CheckinRequest, GenerateAvatarRequest, UploadResponse
from .store import Store, normalize_username
from .wiro import WiroClient, extract_output_url, extract_scores, extract_task_id, extract_task_status, task_failed

DEFAULT_HEAD_ASSET = Path(__file__).resolve().parent.parent / "assets" / "default_head.svg"
BASE_AVATAR_PROMPT = (
    "Create a stylized 3D cartoon full-body fitness avatar from the SAME person's front and back body photos.\n\n"
    "STRICT BODY LOCK:\n"
    "- Copy only the body below the neck from the body photos.\n"
    "- Preserve shoulder width, torso thickness, waist shape, hip ratio, arm volume, leg volume, posture and asymmetry.\n"
    "- DO NOT invent extra muscle separation, six-pack abs, chest cuts, V-taper, or athletic sharpness unless they are clearly visible in BOTH photos.\n"
    "- If uncertain, choose the softer and less muscular interpretation.\n"
    "- Keep body fat and muscle definition conservative and realistic.\n\n"
    "HEAD RULE:\n"
    "- Ignore the head, face, hair, emoji, mask, sticker or any face covering in the uploaded body photos.\n"
    "- Use the supplied default head reference as the avatar head.\n"
    "- Treat the supplied head reference as if it is the user's head for this avatar system.\n"
    "- Never copy alien emojis, masks, or face edits from the body photos.\n\n"
    "OUTPUT RULES:\n"
    "- Non-photorealistic 3D cartoon character\n"
    "- Full body\n"
    "- Black shorts\n"
    "- Clean edges, production-ready cutout style\n"
    "- Fully transparent background PNG\n"
    "- No text, no logos, no watermark\n"
)


def build_avatar_prompt(view: str, user_input: str | None, has_identity: bool) -> str:
    prompt = BASE_AVATAR_PROMPT
    if view == "front":
        prompt += (
            "\nVIEW DIRECTION:\n"
            "- Render the avatar from the FRONT.\n"
            "- Show the chest, abdomen, quads and front silhouette.\n"
            "- Neutral A-pose."
        )
    else:
        prompt += (
            "\nVIEW DIRECTION:\n"
            "- Render the avatar from the BACK.\n"
            "- Show the back, lats, shoulders, glutes and calves from behind.\n"
            "- Neutral A-pose."
        )
    if has_identity:
        prompt += (
            "\n\nIDENTITY CONTINUITY:\n"
            "- Preserve the existing avatar identity, silhouette, proportions, and recognizable body character.\n"
            "- Treat the existing avatar as the base identity and evolve it instead of replacing it."
        )
    if user_input and user_input.strip():
        prompt += (
            "\n\nTODAY CONTEXT:\n"
            f"- Reflect these body-relevant notes subtly in the evolution: {user_input.strip()}\n"
            "- Keep the same identity while updating the physique conservatively."
        )
    return prompt


def fallback_stats(previous_stats: dict[str, int] | None, user_input: str | None) -> dict[str, int]:
    stats = dict(previous_stats or {"muscle": 24, "fat": 42, "posture": 50, "tone": 28})
    context = (user_input or "").lower()
    positive_terms = {
        "muscle": ("workout", "lift", "lat pull", "pull down", "protein", "gym", "push", "squat"),
        "fat": ("diet", "deficit", "cardio", "walk", "steps", "water", "lean"),
        "posture": ("mobility", "stretch", "yoga", "posture", "pilates"),
        "tone": ("run", "cardio", "athletic", "conditioning", "hiit"),
    }
    for key, words in positive_terms.items():
        hits = sum(1 for word in words if word in context)
        if key == "fat":
            stats[key] = max(12, min(88, stats[key] - hits))
        else:
            stats[key] = max(12, min(88, stats[key] + hits))
    return stats


def resolve_scored_stats(
    score_payload: dict,
    previous_stats: dict[str, int] | None,
    user_input: str | None,
) -> dict[str, int]:
    scored_stats = extract_scores(score_payload)
    if scored_stats and any(value > 0 for value in scored_stats.values()):
        return scored_stats
    return fallback_stats(previous_stats, user_input)


def has_meaningful_scores(score_payload: dict) -> bool:
    scored_stats = extract_scores(score_payload)
    if not scored_stats:
        return False
    values = list(scored_stats.values())
    if not any(value > 0 for value in values):
        return False
    if len(set(values)) == 1:
        return False
    return True


async def resolve_avatar_view(
    *,
    user_id: str,
    view: str,
    wiro: WiroClient,
    store: Store,
    front_url: str,
    back_url: str | None,
    prompt: str,
    identity_image_url: str | None,
    head_reference_url: str,
) -> tuple[str | None, dict]:
    try:
        result = await wiro.run_avatar(
            front_url,
            back_url,
            prompt,
            identity_image_url=identity_image_url,
            head_reference_url=head_reference_url,
        )
    except Exception as exc:
        result = await wiro.run_avatar(
            front_url,
            back_url,
            prompt,
            use_fallback=True,
            identity_image_url=identity_image_url,
            head_reference_url=head_reference_url,
        )
        result["primary_error"] = str(exc)
    task_id = extract_task_id(result)
    output_url = extract_output_url(result, {front_url, back_url or "", head_reference_url})
    final_payload = result
    if not output_url and task_id:
        for _ in range(20):
            await asyncio.sleep(1.5)
            detail = await wiro.task_detail(task_id)
            if task_failed(detail):
                final_payload = detail
                break
            output_url = extract_output_url(detail, {front_url, back_url or "", head_reference_url})
            final_payload = detail
            if output_url:
                break
    if not output_url:
        raise HTTPException(status_code=502, detail=f"Wiro did not return an output URL for {view} view.")
    final_url, bg_metadata = await finalize_avatar_image(user_id, output_url, wiro, store)
    metadata = {**final_payload, "postprocess": bg_metadata, "view": view}
    return final_url, metadata

app = FastAPI(title="AI Fitness Avatar Evolution API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5555",
        "http://127.0.0.1:5555",
        "http://localhost:5556",
        "http://127.0.0.1:5556",
        "http://localhost:5558",
        "http://127.0.0.1:5558",
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
    return normalize_username(value)


async def finalize_avatar_image(
    user_id: str,
    image_url: str,
    wiro: WiroClient,
    store: Store,
) -> tuple[str, dict]:
    try:
        remove_payload = await wiro.remove_background(image_url)
        ignored_urls = {image_url}
        cleaned_url = extract_output_url(remove_payload, ignored_urls)
        remove_task_id = extract_task_id(remove_payload)
        if not cleaned_url and remove_task_id:
            for _ in range(20):
                await asyncio.sleep(1.5)
                detail = await wiro.task_detail(remove_task_id)
                if task_failed(detail):
                    remove_payload = detail
                    break
                cleaned_url = extract_output_url(detail, ignored_urls)
                remove_payload = detail
                if cleaned_url:
                    break
        final_source_url = cleaned_url or image_url
        stored_url = await store.upload_avatar_generation_from_url(user_id, final_source_url)
        return stored_url, {
            "remove_background": remove_payload,
            "source_output_url": image_url,
            "cleaned_output_url": cleaned_url,
            "background_removed": bool(cleaned_url),
        }
    except Exception as exc:
        stored_url = await store.upload_avatar_generation_from_url(user_id, image_url)
        return stored_url, {
            "remove_background_error": str(exc),
            "source_output_url": image_url,
            "cleaned_output_url": None,
            "background_removed": False,
        }


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, bool]:
    return {
        "ok": True,
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "wiro_configured": bool(settings.wiro_api_key),
        "score_llm_configured": bool(settings.wiro_api_key),
    }


@app.post("/api/session/anonymous")
def create_anonymous_session(payload: AnonymousSessionRequest, store: Store = Depends(get_store)) -> dict:
    return store.create_profile(clean_username(payload.username))


@app.post("/api/auth/register")
def register(payload: AuthRequest, store: Store = Depends(get_store)) -> dict:
    return store.register_with_password(payload.username, payload.password)


@app.post("/api/auth/login")
def login(payload: AuthRequest, store: Store = Depends(get_store)) -> dict:
    return store.login_with_password(payload.username, payload.password)


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
    identity_image_url = current_avatar.get("image_url")
    head_reference_url = store.ensure_public_asset("default-head.svg", str(DEFAULT_HEAD_ASSET), "image/svg+xml")
    if payload.spend_credit:
        store.spend_credit(payload.user_id)

    wiro = WiroClient(settings)
    if not wiro.configured:
        raise HTTPException(status_code=503, detail="Wiro API key is missing. Real avatar generation requires WIRO_API_KEY.")

    try:
        score_payload = await wiro.run_body_score(payload.front_url, payload.back_url, payload.user_input)
    except Exception as score_exc:
        raise HTTPException(status_code=502, detail=f"Photo score generation failed: {score_exc}") from score_exc

    scored_stats = extract_scores(score_payload)
    score_task_id = extract_task_id(score_payload)
    if score_task_id and not has_meaningful_scores(score_payload):
        for _ in range(12):
            await asyncio.sleep(1.5)
            detail = await wiro.task_detail(score_task_id)
            if task_failed(detail):
                break
            scored_stats = extract_scores(detail)
            if has_meaningful_scores(detail):
                break
    scored_stats = (scored_stats if scored_stats and any(value > 0 for value in scored_stats.values()) else None) or fallback_stats(
        stats,
        payload.user_input,
    )

    front_prompt = build_avatar_prompt("front", payload.user_input, bool(identity_image_url))
    back_prompt = build_avatar_prompt("back", payload.user_input, bool(identity_image_url))
    front_result, back_result = await asyncio.gather(
        resolve_avatar_view(
            user_id=payload.user_id,
            view="front",
            wiro=wiro,
            store=store,
            front_url=payload.front_url,
            back_url=payload.back_url,
            prompt=front_prompt,
            identity_image_url=identity_image_url,
            head_reference_url=head_reference_url,
        ),
        resolve_avatar_view(
            user_id=payload.user_id,
            view="back",
            wiro=wiro,
            store=store,
            front_url=payload.front_url,
            back_url=payload.back_url,
            prompt=back_prompt,
            identity_image_url=identity_image_url,
            head_reference_url=head_reference_url,
        ),
    )
    front_output_url, front_metadata = front_result
    back_output_url, back_metadata = back_result
    final_metadata = {
        "front_generation": front_metadata,
        "back_generation": back_metadata,
        "views": {"front": front_output_url, "back": back_output_url},
        "score_payload": score_payload,
        "identity_source_url": identity_image_url,
        "head_reference_url": head_reference_url,
    }
    version = store.create_avatar_version(
        user_id=payload.user_id,
        image_url=front_output_url,
        stats=scored_stats or fallback_stats(stats, payload.user_input),
        source_front_url=payload.front_url,
        source_back_url=payload.back_url,
        wiro_task_id=None,
        wiro_status="completed",
        wiro_metadata=final_metadata,
    )
    return {"mode": "wiro", "task_id": None, "avatar_version": version, "state": store.get_state(payload.user_id)}


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
    metadata = payload
    if existing and existing.get("image_url") and existing.get("wiro_status") == "completed":
        output_url = existing["image_url"]
        metadata = existing.get("wiro_metadata") or payload
    elif output_url and existing:
        output_url, bg_metadata = await finalize_avatar_image(existing["user_id"], output_url, wiro, store)
        existing_metadata = existing.get("wiro_metadata") or {}
        existing_views = existing_metadata.get("views") if isinstance(existing_metadata, dict) else {}
        metadata = {
            **payload,
            "postprocess": bg_metadata,
            "views": {
                "front": output_url,
                "back": (existing_views or {}).get("back") or existing.get("source_back_url"),
            },
            "score_payload": existing_metadata.get("score_payload"),
            "identity_source_url": existing_metadata.get("identity_source_url"),
        }
    version = store.update_avatar_task(task_id, status, output_url, metadata)
    user_id = version.get("user_id") if version else None
    state = store.get_state(user_id) if user_id else None
    return {"task_id": task_id, "status": status, "output_url": output_url, "avatar_version": version, "state": state}


@app.post("/api/checkins/today")
def submit_checkin(payload: CheckinRequest, store: Store = Depends(get_store)) -> dict:
    return store.apply_checkin(payload.user_id, payload.workout, payload.diet, payload.water_cups)


@app.get("/api/me/state")
def get_me_state(user_id: str, store: Store = Depends(get_store)) -> dict:
    return store.get_state(user_id)


@app.get("/api/leaderboard")
def get_leaderboard(user_id: str, sort: str = "xp", store: Store = Depends(get_store)) -> dict:
    return store.get_leaderboard(user_id, sort)
