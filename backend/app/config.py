from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_body_bucket: str = "body-uploads"
    supabase_avatar_bucket: str = "avatar-generations"
    wiro_api_key: str = ""
    wiro_api_secret: str = ""
    wiro_avatar_model_owner: str = "wiro"
    wiro_avatar_model_slug: str = "image-edit-general"
    wiro_fallback_model_owner: str = "google"
    wiro_fallback_model_slug: str = "nano-banana"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
