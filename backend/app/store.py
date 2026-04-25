from datetime import date, timedelta
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from supabase import Client, create_client

from .config import Settings

BASE_STATS = {"muscle": 24, "fat": 42, "posture": 50, "tone": 28}
REAL_AVATAR_STATUSES = {"running", "completed", "task_postprocess_end", "task_end", "evolved", "failed"}
SOURCE_BUCKET_MARKERS = ("/body-uploads/", "/storage/v1/object/sign/body-uploads/")


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: Client | None = None
        if settings.supabase_url and settings.supabase_service_role_key:
            self.client = create_client(settings.supabase_url, settings.supabase_service_role_key)

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
        result = client.table("profiles").insert(payload).execute()
        profile = result.data[0]
        return self.get_state(profile["id"])

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
            "stats": stats or BASE_STATS,
            "wiro_task_id": wiro_task_id,
            "wiro_status": wiro_status,
            "wiro_metadata": wiro_metadata or {},
        }
        result = client.table("avatar_versions").insert(payload).execute()
        return result.data[0]

    def update_avatar_task(self, task_id: str, status: str, image_url: str | None, metadata: dict[str, Any]) -> dict[str, Any]:
        client = self.require_client()
        payload: dict[str, Any] = {"wiro_status": status, "wiro_metadata": metadata}
        if image_url:
            payload["image_url"] = image_url
        result = client.table("avatar_versions").update(payload).eq("wiro_task_id", task_id).execute()
        return result.data[0] if result.data else {}

    def get_avatar_by_task(self, task_id: str) -> dict[str, Any] | None:
        client = self.require_client()
        result = client.table("avatar_versions").select("*").eq("wiro_task_id", task_id).limit(1).execute()
        return result.data[0] if result.data else None

    def get_avatar_history(self, user_id: str) -> list[dict[str, Any]]:
        client = self.require_client()
        result = (
            client.table("avatar_versions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return [row for row in result.data if self._is_real_avatar_row(row)]

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
            .limit(7)
            .execute()
        )
        return {
            "profile": profile,
            "current_avatar": history[-1] if history else None,
            "avatar_history": history,
            "recent_logs": log_result.data,
        }

    def apply_checkin(self, user_id: str, workout: bool, diet: bool, water_cups: int) -> dict[str, Any]:
        client = self.require_client()
        today = date.today()
        current_state = self.get_state(user_id)
        profile = current_state["profile"]
        avatar = current_state["current_avatar"] or {"stats": BASE_STATS, "image_url": None}
        stats = dict(avatar["stats"] or BASE_STATS)

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
        stats["posture"] = min(100, stats.get("posture", 50) + (1 if workout else 0))
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
            raise HTTPException(status_code=402, detail="Avatar update icin kredi yetersiz.")
        client.table("profiles").update({"credits": credits - 1}).eq("id", user_id).execute()

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
