export type Profile = {
  id: string;
  username: string;
  xp: number;
  level: number;
  credits: number;
  streak_count: number;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
};

export type AvatarVersion = {
  id: string;
  day_number: number;
  image_url: string | null;
  stats: AvatarStats;
  wiro_status: string;
  wiro_task_id?: string | null;
  views?: {
    front?: string | null;
    back?: string | null;
  };
};

export type AvatarStats = {
  muscle: number;
  fat: number;
  tone: number;
};

export type AppState = {
  profile: Profile;
  current_avatar: AvatarVersion | null;
  avatar_history: AvatarVersion[];
  recent_logs: Array<{
    id: string;
    log_date: string;
    workout: boolean;
    diet: boolean;
    water_cups: number;
    xp_earned: number;
  }>;
};

export type LeaderboardSort = "streak" | "muscle" | "fat" | "tone";

export type LeaderboardRow = {
  user_id: string;
  username: string;
  display_name: string;
  rank: number;
  is_current_user: boolean;
  streak_count: number;
  stats: AvatarStats;
  score: number;
};

export type LeaderboardResponse = {
  sort: LeaderboardSort;
  rows: LeaderboardRow[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:7778";

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail ?? "API request failed.");
  }
  return body as T;
}

export async function createAnonymousSession(username?: string): Promise<AppState> {
  const response = await fetch(`${API_BASE}/api/session/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username })
  });
  return parseResponse<AppState>(response);
}

export async function registerWithPassword(username: string, password: string): Promise<AppState> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return parseResponse<AppState>(response);
}

export async function loginWithPassword(username: string, password: string): Promise<AppState> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  return parseResponse<AppState>(response);
}

export async function uploadPhotos(userId: string, front: File, back?: File | null): Promise<{ front_url: string; back_url: string | null }> {
  const form = new FormData();
  form.append("user_id", userId);
  form.append("front", front);
  if (back) form.append("back", back);
  const response = await fetch(`${API_BASE}/api/avatar/upload`, { method: "POST", body: form });
  return parseResponse(response);
}

export async function generateAvatar(input: {
  userId: string;
  frontUrl: string;
  backUrl?: string | null;
  spendCredit?: boolean;
}): Promise<{ mode: string; task_id?: string; state: AppState; avatar_version?: AvatarVersion }> {
  const response = await fetch(`${API_BASE}/api/avatar/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: input.userId,
      front_url: input.frontUrl,
      back_url: input.backUrl,
      spend_credit: Boolean(input.spendCredit)
    })
  });
  return parseResponse(response);
}

export async function getAvatarTask(taskId: string): Promise<{
  task_id: string;
  status: string;
  output_url: string | null;
  avatar_version: AvatarVersion;
  state: AppState | null;
}> {
  const response = await fetch(`${API_BASE}/api/avatar/task/${taskId}`);
  return parseResponse(response);
}

export async function getState(userId: string): Promise<AppState> {
  const response = await fetch(`${API_BASE}/api/me/state?user_id=${encodeURIComponent(userId)}`);
  return parseResponse<AppState>(response);
}

export async function getLeaderboard(userId: string, sort: LeaderboardSort): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ user_id: userId, sort });
  const response = await fetch(`${API_BASE}/api/leaderboard?${params.toString()}`);
  return parseResponse<LeaderboardResponse>(response);
}

export async function submitCheckin(input: {
  userId: string;
  workout: boolean;
  diet: boolean;
  waterLiters: number;
}): Promise<AppState> {
  const response = await fetch(`${API_BASE}/api/checkins/today`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: input.userId,
      workout: input.workout,
      diet: input.diet,
      water_liters: input.waterLiters
    })
  });
  return parseResponse<AppState>(response);
}

export async function completeProfile(input: {
  userId: string;
  age: number;
  heightCm: number;
  weightKg: number;
}): Promise<AppState> {
  const response = await fetch(`${API_BASE}/api/profile/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: input.userId,
      age: input.age,
      height_cm: input.heightCm,
      weight_kg: input.weightKg
    })
  });
  return parseResponse<AppState>(response);
}
