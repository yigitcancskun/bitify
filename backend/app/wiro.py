import hashlib
import hmac
import json
import re
import time
from typing import Any
from urllib.parse import urlsplit

import httpx

from .config import Settings

WIRO_BASE_URL = "https://api.wiro.ai/v1"


class WiroClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def configured(self) -> bool:
        return bool(self.settings.wiro_api_key)

    def _headers(self) -> dict[str, str]:
        headers = {"x-api-key": self.settings.wiro_api_key}
        if self.settings.wiro_api_secret:
            nonce = str(int(time.time() * 1000))
            signature = hmac.new(
                self.settings.wiro_api_key.encode("utf-8"),
                f"{self.settings.wiro_api_secret}{nonce}".encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            headers.update({"x-nonce": nonce, "x-signature": signature})
        return headers

    async def run_avatar(
        self,
        front_image_url: str,
        back_image_url: str | None,
        prompt: str,
        use_fallback: bool = False,
        identity_image_url: str | None = None,
        head_reference_url: str | None = None,
    ) -> dict[str, Any]:
        owner = self.settings.wiro_fallback_model_owner if use_fallback else self.settings.wiro_avatar_model_owner
        slug = self.settings.wiro_fallback_model_slug if use_fallback else self.settings.wiro_avatar_model_slug
        url = f"{WIRO_BASE_URL}/Run/{owner}/{slug}"
        primary_image_url = identity_image_url or front_image_url
        head_image_url = head_reference_url or primary_image_url
        # We send identity plus both body views as references; different models may read these fields differently.
        files = {
            "prompt": (None, prompt),
            "image": (None, primary_image_url),
            "imageUrl": (None, primary_image_url),
            "identityImage": (None, primary_image_url),
            "identityImageUrl": (None, primary_image_url),
            "frontImage": (None, front_image_url),
            "frontImageUrl": (None, front_image_url),
            "inputImage": (None, front_image_url),
            "inputImageUrl": (None, front_image_url),
            "backImage": (None, back_image_url or front_image_url),
            "backImageUrl": (None, back_image_url or front_image_url),
            "referenceImage": (None, primary_image_url),
            "referenceImageUrl": (None, primary_image_url),
            "headImage": (None, head_image_url),
            "headImageUrl": (None, head_image_url),
        }
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, headers=self._headers(), files=files)
            response.raise_for_status()
            return response.json()

    async def run_body_score(
        self,
        front_image_url: str,
        back_image_url: str | None,
        user_input: str | None = None,
    ) -> dict[str, Any]:
        owner = self.settings.wiro_score_model_owner
        slug = self.settings.wiro_score_model_slug
        url = f"{WIRO_BASE_URL}/Run/{owner}/{slug}"
        user_context = (user_input or "").strip()
        prompt = (
            "Analyze the SAME person from front and back body photos for fitness scoring. "
            "Be extremely critical and conservative. Do NOT give high scores unless exceptional evidence exists. "
            "Use this scale: beginner/average bodies should mostly stay in 15-55 range. "
            "Only output strict JSON object and nothing else: "
            '{"muscle":0-100,"fat":0-100,"posture":0-100,"tone":0-100}. '
            "Definitions: muscle=visible muscle development; fat=higher means more body fat; "
            "posture=alignment and balance; tone=overall athletic sharpness. "
            "Ignore head identity, beauty, clothing style, and any identity-related user text. "
            "Only score body composition, posture, and visible athletic form."
            "If user's fat ratio appears high, be more critical on muscle and posture, as these are less visible under high fat."
        )
        if user_context:
            prompt += f" User context for body-only judgment, ignoring identity details: {user_context}"

        files = {
            "prompt": (None, prompt),
            "image": (None, front_image_url),
            "imageUrl": (None, front_image_url),
            "inputImage": (None, back_image_url or front_image_url),
            "inputImageUrl": (None, back_image_url or front_image_url),
            "backImage": (None, back_image_url or front_image_url),
            "backImageUrl": (None, back_image_url or front_image_url),
        }
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, headers=self._headers(), files=files)
            response.raise_for_status()
            return response.json()

    async def remove_background(self, image_url: str) -> dict[str, Any]:
        owner = self.settings.wiro_remove_bg_model_owner
        slug = self.settings.wiro_remove_bg_model_slug
        url = f"{WIRO_BASE_URL}/Run/{owner}/{slug}"
        files = {
            "image": (None, image_url),
            "imageUrl": (None, image_url),
            "inputImage": (None, image_url),
            "inputImageUrl": (None, image_url),
        }
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, headers=self._headers(), files=files)
            response.raise_for_status()
            return response.json()

    async def task_detail(self, task_id: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                f"{WIRO_BASE_URL}/Task/Detail",
                headers=self._headers(),
                json={"taskid": task_id},
            )
            response.raise_for_status()
            return response.json()


def extract_task_id(payload: dict[str, Any]) -> str | None:
    return (
        payload.get("taskid")
        or payload.get("task_id")
        or payload.get("tasktoken")
        or payload.get("data", {}).get("taskid")
        or payload.get("data", {}).get("task_id")
        or payload.get("data", {}).get("tasktoken")
    )


def extract_output_url(payload: dict[str, Any], ignore_urls: set[str] | None = None) -> str | None:
    ignored = {url for url in (ignore_urls or set()) if url}
    ignored_normalized = {_normalize_url(url) for url in ignored}
    for value in _walk_values(payload):
        if not isinstance(value, str) or not value.startswith("http"):
            continue
        if value in ignored:
            continue
        if _normalize_url(value) in ignored_normalized:
            continue
        return value
    return None


def extract_task_status(payload: dict[str, Any]) -> str:
    task = _first_task(payload)
    if task:
        pexit = str(task.get("pexit", ""))
        status = str(task.get("status") or "running")
        if pexit and pexit != "0":
            return "failed"
        if status in {"task_postprocess_end", "task_end"} and pexit == "0":
            return "completed"
        return status
    return str(payload.get("status") or payload.get("data", {}).get("status") or "running")


def task_failed(payload: dict[str, Any]) -> bool:
    if payload.get("result") is False:
        return True
    task = _first_task(payload)
    if task and str(task.get("pexit", "")) not in {"", "0"}:
        return True
    return False


def extract_scores(payload: dict[str, Any]) -> dict[str, int] | None:
    direct = _extract_score_object(payload)
    if direct:
        return direct

    for value in _walk_values(payload):
        if not isinstance(value, str):
            continue
        parsed = _parse_scores_from_text(value)
        if parsed:
            return parsed
    return None


def _first_task(payload: dict[str, Any]) -> dict[str, Any] | None:
    tasklist = payload.get("tasklist") or payload.get("data", {}).get("tasklist")
    if isinstance(tasklist, list) and tasklist and isinstance(tasklist[0], dict):
        return tasklist[0]
    if isinstance(payload.get("task"), dict):
        return payload["task"]
    return None


def _walk_values(value: Any):
    if isinstance(value, dict):
        preferred_keys = [
            "outputs",
            "output",
            "url",
            "image",
            "imageUrl",
            "cdn_url",
            "file_url",
            "result",
            "data",
            "tasklist",
        ]
        for key in preferred_keys:
            if key in value:
                yield from _walk_values(value[key])
        for key, nested in value.items():
            if key not in preferred_keys:
                yield from _walk_values(nested)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_values(item)
    else:
        yield value


def _extract_score_object(value: Any) -> dict[str, int] | None:
    if isinstance(value, dict):
        keys = set(value.keys())
        if {"muscle", "fat", "posture", "tone"}.issubset(keys):
            try:
                return {
                    "muscle": _clamp_score(value["muscle"]),
                    "fat": _clamp_score(value["fat"]),
                    "posture": _clamp_score(value["posture"]),
                    "tone": _clamp_score(value["tone"]),
                }
            except Exception:
                pass
        for nested in value.values():
            found = _extract_score_object(nested)
            if found:
                return found
    elif isinstance(value, list):
        for item in value:
            found = _extract_score_object(item)
            if found:
                return found
    return None


def _parse_scores_from_text(text: str) -> dict[str, int] | None:
    candidate = text.strip()
    if not candidate:
        return None

    try:
        parsed = json.loads(candidate)
        found = _extract_score_object(parsed)
        if found:
            return found
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*?\}", candidate)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    return _extract_score_object(parsed)


def _clamp_score(value: Any) -> int:
    numeric = int(round(float(value)))
    return max(0, min(100, numeric))


def _normalize_url(url: str) -> str:
    parsed = urlsplit(url)
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{parsed.path}"
