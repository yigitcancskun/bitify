import hashlib
import hmac
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
    ) -> dict[str, Any]:
        owner = self.settings.wiro_fallback_model_owner if use_fallback else self.settings.wiro_avatar_model_owner
        slug = self.settings.wiro_fallback_model_slug if use_fallback else self.settings.wiro_avatar_model_slug
        url = f"{WIRO_BASE_URL}/Run/{owner}/{slug}"
        # We send both views as references; different models may read these fields differently.
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


def _normalize_url(url: str) -> str:
    parsed = urlsplit(url)
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{parsed.path}"
