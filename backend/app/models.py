from pydantic import BaseModel, Field


class AnonymousSessionRequest(BaseModel):
    username: str | None = Field(default=None, max_length=24)


class AuthRequest(BaseModel):
    username: str = Field(min_length=2, max_length=24)
    password: str = Field(min_length=6, max_length=128)


class UploadResponse(BaseModel):
    front_url: str
    back_url: str | None = None


class GenerateAvatarRequest(BaseModel):
    user_id: str
    front_url: str
    back_url: str | None = None
    user_input: str | None = Field(default=None, max_length=1200)
    spend_credit: bool = False


class CheckinRequest(BaseModel):
    user_id: str
    workout: bool = False
    diet: bool = False
    water_liters: float = Field(default=0, ge=0, le=8)


class CompleteProfileRequest(BaseModel):
    user_id: str
    age: int = Field(ge=13, le=100)
    height_cm: float = Field(ge=100, le=260)
    weight_kg: float = Field(ge=30, le=300)


class LeaderboardRow(BaseModel):
    user_id: str
    username: str
    display_name: str
    rank: int
    is_current_user: bool
    xp: int
    level: int
    streak_count: int
    stats: dict[str, int]
    score: int


class ApiError(BaseModel):
    detail: str
