import type { AppState } from "@/lib/api";

export type FlowStep = "landing" | "auth" | "flow" | "avatar" | "my-progress" | "community";

export function hasCompletedProfile(state: AppState | null) {
  return state?.profile.age != null && state.profile.height_cm != null && state.profile.weight_kg != null;
}

export function hasCreatedAvatar(state: AppState | null) {
  return Boolean(state?.current_avatar?.image_url);
}

export function getRequiredFlowPath(state: AppState | null) {
  if (!state) return "/auth";
  if (!hasCompletedProfile(state)) return "/flow";
  if (!hasCreatedAvatar(state)) return "/avatar";
  return null;
}

export function getPostAuthPath(state: AppState | null) {
  if (!state) return "/auth";
  if (!hasCompletedProfile(state)) return "/flow";
  return hasCreatedAvatar(state) ? "/my-progress" : "/avatar";
}

export function getNextFlowPath(step: FlowStep) {
  if (step === "landing") return "/auth";
  if (step === "auth") return "/flow";
  if (step === "flow") return "/avatar";
  if (step === "avatar") return "/my-progress";
  if (step === "my-progress") return "/community";
  return null;
}
