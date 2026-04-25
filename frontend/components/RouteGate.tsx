"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AppState } from "@/lib/api";
import { getRequiredFlowPath } from "@/lib/flow";

export function RouteGate({
  state,
  booting,
  pathname
}: {
  state: AppState | null;
  booting: boolean;
  pathname: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (booting) return;
    const requiredPath = getRequiredFlowPath(state);
    if (requiredPath && pathname !== requiredPath) {
      router.replace(requiredPath);
    }
  }, [booting, pathname, router, state]);

  return null;
}
