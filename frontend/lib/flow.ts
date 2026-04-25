import type { AppState } from "@/lib/api";

export type FlowStep = "landing" | "auth" | "avatar" | "my-progress" | "community";

export function hasCreatedAvatar(state: AppState | null) {
  return Boolean(state?.current_avatar?.image_url);
}

export function getRequiredFlowPath(state: AppState | null) {
  if (!state) return "/auth";
  if (!hasCreatedAvatar(state)) return "/avatar";
  return null;
}

export function getPostAuthPath(state: AppState | null) {
  if (!state) return "/auth";
  return hasCreatedAvatar(state) ? "/my-progress" : "/avatar";
}

export function getNextFlowPath(step: FlowStep) {
  if (step === "landing") return "/auth";
  if (step === "auth") return "/avatar";
  if (step === "avatar") return "/my-progress";
  if (step === "my-progress") return "/community";
  return null;
}
