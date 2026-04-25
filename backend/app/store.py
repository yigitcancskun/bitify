from datetime import date, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile
from postgrest.exceptions import APIError
from supabase import Client, create_client

from .config import Settings

BASE_STATS = {"muscle": 24, "fat": 42, "tone": 28}
REAL_AVATAR_STATUSES = {"running", "completed", "task_postprocess_end", "task_end", "evolved", "failed"}
SOURCE_BUCKET_MARKERS = ("/body-uploads/", "/storage/v1/object/sign/body-uploads/")
LEADERBOARD_SORTS = {"xp", "level", "streak", "muscle", "fat", "tone"}
AUTH_EMAIL_DOMAIN = "users.bitify.local"
RLS_ERROR = (
    "Supabase blocked the profiles query with row-level security. "
    "Use the service role key in backend/.env, then rerun backend/sql/schema.sql in Supabase SQL editor."
)


def normalize_stats(stats: dict[str, Any] | None) -> dict[str, int]:
    raw = stats or {}
    return {
        "muscle": int(raw.get("muscle", BASE_STATS["muscle"])),
        "fat": int(raw.get("fat", BASE_STATS["fat"])),
        "tone": int(raw.get("tone", BASE_STATS["tone"])),
    }


def normalize_username(value: str) -> str:
    cleaned = "".join(char for char in value.strip() if char.isalnum() or char in "_-")
    if len(cleaned) < 2:
        raise HTTPException(status_code=422, detail="Nickname must be at least 2 characters.")
    return cleaned[:24]


def username_to_auth_email(username: str) -> str:
    return f"{username.lower()}@{AUTH_EMAIL_DOMAIN}"


def _is_missing_auth_user_id_error(exc: APIError) -> bool:
    return "auth_user_id" in str(exc)


def _is_rls_error(exc: APIError) -> bool:
    return "row-level security" in str(exc).lower()


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: Client | None = None
        if settings.supabase_url and settings.supabase_service_role_key:
            self.client = self._build_client()

    def _build_client(self) -> Client:
        return create_client(self.settings.supabase_url, self.settings.supabase_service_role_key)

    @property
    def configured(self) -> bool:
        return self.client is not None

    def require_client(self) -> Client:
        if not self.client:
            raise HTTPException(
                status_code=503,
                detail="Supabase env is missing. Fill SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
            )
        return self.client

    def create_profile(self, username: str) -> dict[str, Any]:
        client = self.require_client()
        payload = {"username": username, "xp": 0, "level": 1, "credits": 3, "streak_count": 0}
        try:
            result = client.table("profiles").insert(payload).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            raise
        profile = result.data[0]
        return self.get_state(profile["id"])

    def register_with_password(self, username: str, password: str) -> dict[str, Any]:
        client = self.require_client()
        auth_client = self._build_client()
        normalized = normalize_username(username)
        email = username_to_auth_email(normalized)
        try:
            existing = client.table("profiles").select("id").eq("username", normalized).limit(1).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            raise
        if existing.data:
            raise HTTPException(status_code=409, detail="Nickname is already taken.")
        try:
            auth_response = auth_client.auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"username": normalized},
                }
            )
        except Exception as exc:
            if "already been registered" not in str(exc).lower():
                raise HTTPException(status_code=409, detail=f"Could not create auth user: {exc}") from exc
            try:
                auth_response = auth_client.auth.sign_in_with_password({"email": email, "password": password})
            except Exception as signin_exc:
                raise HTTPException(status_code=409, detail="Nickname is already taken.") from signin_exc

        auth_user = auth_response.user
        result = self._insert_profile_for_auth(normalized, auth_user.id)
        profile = result.data[0]
        return self.get_state(profile["id"])

    def login_with_password(self, username: str, password: str) -> dict[str, Any]:
        client = self.require_client()
        auth_client = self._build_client()
        normalized = normalize_username(username)
        email = username_to_auth_email(normalized)
        try:
            auth_response = auth_client.auth.sign_in_with_password({"email": email, "password": password})
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid nickname or password.") from exc

        auth_user = auth_response.user
        result = self._get_profile_by_auth_user_id(auth_user.id)
        if not result.data:
            try:
                existing = client.table("profiles").select("*").eq("username", normalized).limit(1).execute()
            except APIError as exc:
                if _is_rls_error(exc):
                    raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
                raise
            if existing.data:
                profile = existing.data[0]
                self._attach_auth_user_id(profile["id"], auth_user.id)
                return self.get_state(profile["id"])
            raise HTTPException(status_code=404, detail="Profile not found for this account.")
        return self.get_state(result.data[0]["id"])

    def _insert_profile_for_auth(self, username: str, auth_user_id: str) -> Any:
        client = self.require_client()
        payload = {
            "auth_user_id": auth_user_id,
            "username": username,
            "xp": 0,
            "level": 1,
            "credits": 3,
            "streak_count": 0,
        }
        try:
            return client.table("profiles").insert(payload).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            if not _is_missing_auth_user_id_error(exc):
                raise
        fallback_payload = {key: value for key, value in payload.items() if key != "auth_user_id"}
        try:
            return client.table("profiles").insert(fallback_payload).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            raise

    def _get_profile_by_auth_user_id(self, auth_user_id: str) -> Any:
        client = self.require_client()
        try:
            return client.table("profiles").select("*").eq("auth_user_id", auth_user_id).limit(1).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            if not _is_missing_auth_user_id_error(exc):
                raise
            return client.table("profiles").select("*").limit(0).execute()

    def _attach_auth_user_id(self, profile_id: str, auth_user_id: str) -> None:
        client = self.require_client()
        try:
            client.table("profiles").update({"auth_user_id": auth_user_id}).eq("id", profile_id).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            if not _is_missing_auth_user_id_error(exc):
                raise

    async def upload_photo(self, user_id: str, kind: str, file: UploadFile) -> str:
        client = self.require_client()
        extension = (file.filename or "photo.jpg").split(".")[-1].lower()
        path = f"{user_id}/{kind}-{uuid4().hex}.{extension}"
        body = await file.read()
        client.storage.from_(self.settings.supabase_body_bucket).upload(
            path,
            body,
            {"content-type": file.content_type or "image/jpeg", "upsert": "false"},
        )
        return client.storage.from_(self.settings.supabase_body_bucket).create_signed_url(path, 60 * 60)["signedURL"]

    async def upload_avatar_generation_from_url(self, user_id: str, image_url: str) -> str:
        client = self.require_client()
        async with httpx.AsyncClient(timeout=45) as http_client:
            response = await http_client.get(image_url)
            response.raise_for_status()
            body = response.content

        path = f"{user_id}/avatar-{uuid4().hex}.png"
        client.storage.from_(self.settings.supabase_avatar_bucket).upload(
            path,
            body,
            {"content-type": "image/png", "upsert": "false"},
        )
        public_url = client.storage.from_(self.settings.supabase_avatar_bucket).get_public_url(path)
        if isinstance(public_url, str):
            return public_url
        resolved_url = public_url.get("publicURL") or public_url.get("publicUrl") or public_url.get("signedURL")
        if not resolved_url:
            raise HTTPException(status_code=502, detail="Supabase did not return a public URL for processed avatar.")
        return resolved_url

    def ensure_public_asset(self, asset_name: str, local_path: str, content_type: str) -> str:
        client = self.require_client()
        path = f"system/{asset_name}"
        body = Path(local_path).read_bytes()
        client.storage.from_(self.settings.supabase_avatar_bucket).upload(
            path,
            body,
            {"content-type": content_type, "upsert": "true"},
        )
        public_url = client.storage.from_(self.settings.supabase_avatar_bucket).get_public_url(path)
        if isinstance(public_url, str):
            return public_url
        resolved_url = public_url.get("publicURL") or public_url.get("publicUrl") or public_url.get("signedURL")
        if not resolved_url:
            raise HTTPException(status_code=502, detail="Supabase did not return a public URL for system asset.")
        return resolved_url

    def create_avatar_version(
        self,
        user_id: str,
        image_url: str | None,
        stats: dict[str, int] | None = None,
        source_front_url: str | None = None,
        source_back_url: str | None = None,
        wiro_task_id: str | None = None,
        wiro_status: str = "mock",
        wiro_metadata: dict[str, Any] | None = None,
        day_number: int | None = None,
    ) -> dict[str, Any]:
        client = self.require_client()
        if day_number is None:
            history = self.get_avatar_history(user_id)
            day_number = len(history) + 1
        payload = {
            "user_id": user_id,
            "day_number": day_number,
            "image_url": image_url,
            "source_front_url": source_front_url,
            "source_back_url": source_back_url,
            "stats": normalize_stats(stats),
            "wiro_task_id": wiro_task_id,
            "wiro_status": wiro_status,
            "wiro_metadata": wiro_metadata or {},
        }
        result = client.table("avatar_versions").insert(payload).execute()
        return self._serialize_avatar_row(result.data[0])

    def update_avatar_task(self, task_id: str, status: str, image_url: str | None, metadata: dict[str, Any]) -> dict[str, Any]:
        client = self.require_client()
        payload: dict[str, Any] = {"wiro_status": status, "wiro_metadata": metadata}
        if image_url:
            payload["image_url"] = image_url
        result = client.table("avatar_versions").update(payload).eq("wiro_task_id", task_id).execute()
        return self._serialize_avatar_row(result.data[0]) if result.data else {}

    def get_avatar_by_task(self, task_id: str) -> dict[str, Any] | None:
        client = self.require_client()
        result = client.table("avatar_versions").select("*").eq("wiro_task_id", task_id).limit(1).execute()
        return self._serialize_avatar_row(result.data[0]) if result.data else None

    def get_avatar_history(self, user_id: str) -> list[dict[str, Any]]:
        client = self.require_client()
        result = (
            client.table("avatar_versions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return [self._serialize_avatar_row(row) for row in result.data if self._is_real_avatar_row(row)]

    def get_state(self, user_id: str) -> dict[str, Any]:
        client = self.require_client()
        profile_result = client.table("profiles").select("*").eq("id", user_id).single().execute()
        profile = profile_result.data
        history = self.get_avatar_history(user_id)
        log_result = (
            client.table("daily_logs")
            .select("*")
            .eq("user_id", user_id)
            .order("log_date", desc=True)
            .limit(30)
            .execute()
        )
        return {
            "profile": profile,
            "current_avatar": history[-1] if history else None,
            "avatar_history": history,
            "recent_logs": log_result.data,
        }

    def complete_profile(self, user_id: str, age: int, height_cm: float, weight_kg: float) -> dict[str, Any]:
        client = self.require_client()
        try:
            client.table("profiles").update(
                {
                    "age": int(age),
                    "height_cm": float(height_cm),
                    "weight_kg": float(weight_kg),
                }
            ).eq("id", user_id).execute()
        except APIError as exc:
            if _is_rls_error(exc):
                raise HTTPException(status_code=503, detail=RLS_ERROR) from exc
            if "Could not find the 'age' column" in str(exc):
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Profile fields are not ready in Supabase yet. "
                        "Please run backend/sql/schema.sql in Supabase SQL Editor, then retry."
                    ),
                ) from exc
            raise
        return self.get_state(user_id)

    def get_leaderboard(self, current_user_id: str, sort: str = "xp") -> dict[str, Any]:
        client = self.require_client()
        sort_key = sort if sort in LEADERBOARD_SORTS else "xp"
        profiles_result = client.table("profiles").select("*").execute()
        avatar_result = (
            client.table("avatar_versions")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        latest_avatar_by_user: dict[str, dict[str, Any]] = {}
        for row in avatar_result.data:
            user_id = row.get("user_id")
            if not user_id or user_id in latest_avatar_by_user:
                continue
            if self._is_real_avatar_row(row):
                latest_avatar_by_user[user_id] = row

        rows = []
        for profile in profiles_result.data:
            user_id = profile["id"]
            stats = normalize_stats((latest_avatar_by_user.get(user_id) or {}).get("stats"))
            score = self._leaderboard_score(profile, stats, sort_key)
            rows.append(
                {
                    "user_id": user_id,
                    "username": profile["username"],
                    "display_name": "You" if user_id == current_user_id else profile["username"],
                    "is_current_user": user_id == current_user_id,
                    "xp": profile["xp"],
                    "level": profile["level"],
                    "streak_count": profile["streak_count"],
                    "stats": stats,
                    "score": score,
                }
            )

        if sort_key == "fat":
            rows.sort(
                key=lambda row: (
                    row["score"],
                    -row["xp"],
                    -row["level"],
                    -row["streak_count"],
                    row["username"].lower(),
                )
            )
        else:
            rows.sort(
                key=lambda row: (
                    -row["score"],
                    -row["xp"],
                    -row["level"],
                    -row["streak_count"],
                    row["username"].lower(),
                )
            )
        for index, row in enumerate(rows, start=1):
            row["rank"] = index
        return {"sort": sort_key, "rows": rows}

    def apply_checkin(self, user_id: str, workout: bool, diet: bool, water_liters: float) -> dict[str, Any]:
        client = self.require_client()
        today = date.today()
        current_state = self.get_state(user_id)
        profile = current_state["profile"]
        avatar = current_state["current_avatar"] or {"stats": BASE_STATS, "image_url": None}
        stats = normalize_stats(avatar["stats"])
        water_cups = max(0, min(24, int(round(float(water_liters) * 4))))

        xp_earned = (35 if workout else 0) + (25 if diet else 0) + (15 if water_cups >= 8 else 0)
        credits_earned = 1 if xp_earned else 0
        last_checkin = profile.get("last_checkin_date")
        if last_checkin == today.isoformat():
            streak = profile["streak_count"]
        elif last_checkin == (today - timedelta(days=1)).isoformat():
            streak = profile["streak_count"] + 1
        else:
            streak = 1 if xp_earned else 0
        if xp_earned and streak and streak % 3 == 0:
            credits_earned += 3

        stats["muscle"] = min(100, stats.get("muscle", 24) + (2 if workout else 0))
        stats["fat"] = max(8, stats.get("fat", 42) - (1 if diet else 0) - (1 if water_cups >= 8 else 0))
        stats["tone"] = min(100, stats.get("tone", 28) + (1 if workout else 0) + (1 if diet else 0))

        client.table("daily_logs").upsert(
            {
                "user_id": user_id,
                "log_date": today.isoformat(),
                "workout": workout,
                "diet": diet,
                "water_cups": water_cups,
                "xp_earned": xp_earned,
                "credits_earned": credits_earned,
            },
            on_conflict="user_id,log_date",
        ).execute()

        new_xp = profile["xp"] + xp_earned
        new_credits = profile["credits"] + credits_earned
        level = new_xp // 100 + 1
        client.table("profiles").update(
            {
                "xp": new_xp,
                "credits": new_credits,
                "level": level,
                "streak_count": streak,
                "last_checkin_date": today.isoformat() if xp_earned else profile.get("last_checkin_date"),
            }
        ).eq("id", user_id).execute()

        self.create_avatar_version(
            user_id=user_id,
            image_url=avatar.get("image_url"),
            stats=stats,
            wiro_status="evolved",
        )
        return self.get_state(user_id)

    def spend_credit(self, user_id: str) -> None:
        client = self.require_client()
        state = self.get_state(user_id)
        credits = state["profile"]["credits"]
        if credits < 1:
            raise HTTPException(status_code=402, detail="Not enough credits for avatar update.")
        client.table("profiles").update({"credits": credits - 1}).eq("id", user_id).execute()

    @staticmethod
    def _leaderboard_score(profile: dict[str, Any], stats: dict[str, int], sort: str) -> int:
        if sort == "level":
            return int(profile.get("level") or 0)
        if sort == "streak":
            return int(profile.get("streak_count") or 0)
        if sort in {"muscle", "fat", "tone"}:
            return int(stats.get(sort) or 0)
        return int(profile.get("xp") or 0)

    @staticmethod
    def _is_real_avatar_row(row: dict[str, Any]) -> bool:
        image_url = row.get("image_url")
        if isinstance(image_url, str):
            lowered = image_url.lower()
            if any(marker in lowered for marker in SOURCE_BUCKET_MARKERS):
                return False
        if (
            isinstance(image_url, str)
            and image_url.startswith("http")
            and image_url not in {row.get("source_front_url"), row.get("source_back_url")}
        ):
            return True
        if row.get("wiro_task_id") and row.get("wiro_status") in REAL_AVATAR_STATUSES:
            return True
        return False

    @staticmethod
    def _serialize_avatar_row(row: dict[str, Any]) -> dict[str, Any]:
        serialized = dict(row)
        metadata = serialized.get("wiro_metadata") or {}
        views = metadata.get("views") if isinstance(metadata, dict) else {}
        front_view = views.get("front") if isinstance(views, dict) else None
        back_view = views.get("back") if isinstance(views, dict) else None
        serialized["views"] = {
            "front": front_view or serialized.get("image_url"),
            "back": back_view or serialized.get("source_back_url"),
        }
        serialized["stats"] = normalize_stats(serialized.get("stats"))
        return serialized
