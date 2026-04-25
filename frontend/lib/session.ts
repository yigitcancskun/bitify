"use client";

import { useCallback, useEffect, useState } from "react";
import { createAnonymousSession, getState, type AppState } from "@/lib/api";

const SESSION_KEY = "bitify_user_id";

export function useFitnessSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<AppState | null>(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshState = useCallback(
    async (explicitUserId?: string) => {
      const activeUserId = explicitUserId ?? userId;
      if (!activeUserId) return null;
      const next = await getState(activeUserId);
      setState(next);
      return next;
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    const savedUserId = window.localStorage.getItem(SESSION_KEY);
    if (!savedUserId) {
      setBooting(false);
      return;
    }

    setUserId(savedUserId);
    refreshState(savedUserId)
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to restore session.");
        window.localStorage.removeItem(SESSION_KEY);
        setUserId(null);
        setState(null);
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshState]);

  const startAnonymous = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await createAnonymousSession(username);
      setState(session);
      setUserId(session.profile.id);
      window.localStorage.setItem(SESSION_KEY, session.profile.id);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start anonymous session.");
      return null;
    } finally {
      setLoading(false);
      setBooting(false);
    }
  }, []);

  return {
    userId,
    state,
    setState,
    booting,
    loading,
    error,
    setError,
    startAnonymous,
    refreshState
  };
}
