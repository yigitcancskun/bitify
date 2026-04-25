from pydantic import BaseModel, Field


class AnonymousSessionRequest(BaseModel):
    username: str | None = Field(default=None, max_length=24)


class UploadResponse(BaseModel):
    front_url: str
    back_url: str | None = None


class GenerateAvatarRequest(BaseModel):
    user_id: str
    front_url: str
    back_url: str | None = None
    spend_credit: bool = False


class CheckinRequest(BaseModel):
    user_id: str
    workout: bool = False
    diet: bool = False
    water_cups: int = Field(default=0, ge=0, le=24)


class ApiError(BaseModel):
    detail: str
