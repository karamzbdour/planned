"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function formatLessonTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

interface UseLessonTimerOptions {
  lessonId: string;
  initialSeconds?: number;
  status: string; // PENDING | IN_PROGRESS | COMPLETED
  initialPaused?: boolean;
  idleTimeoutMs?: number; // default 120,000 (2 mins)
  syncIntervalMs?: number; // default 20,000 (20s)
}

export function useLessonTimer({
  lessonId,
  initialSeconds = 0,
  status,
  initialPaused = false,
  idleTimeoutMs = 120_000,
  syncIntervalMs = 20_000,
}: UseLessonTimerOptions) {
  const [activeSeconds, setActiveSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [isIdle, setIsIdle] = useState(false);

  const activeSecondsRef = useRef(initialSeconds);
  const isPausedRef = useRef(initialPaused);
  const isIdleRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastSyncedSecondsRef = useRef(initialSeconds);

  // Keep refs in sync with state
  useEffect(() => {
    activeSecondsRef.current = activeSeconds;
  }, [activeSeconds]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isIdleRef.current = isIdle;
  }, [isIdle]);

  // Sync initial seconds from props if they change externally (e.g. initial fetch)
  useEffect(() => {
    if (initialSeconds > 0 && activeSecondsRef.current === 0) {
      setActiveSeconds(initialSeconds);
      activeSecondsRef.current = initialSeconds;
      lastSyncedSecondsRef.current = initialSeconds;
    }
  }, [initialSeconds]);

  useEffect(() => {
    setIsPaused(initialPaused);
    isPausedRef.current = initialPaused;
  }, [initialPaused]);

  // Helper to send sync payload to server
  const sendSync = useCallback(
    async (seconds: number, paused: boolean, useBeacon = false) => {
      if (!lessonId || status !== "IN_PROGRESS") return;

      const payload = JSON.stringify({
        activeSeconds: seconds,
        isPaused: paused,
      });

      if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`/api/lessons/${lessonId}/sync-time`, blob);
        lastSyncedSecondsRef.current = seconds;
        return;
      }

      try {
        await fetch(`/api/lessons/${lessonId}/sync-time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
        lastSyncedSecondsRef.current = seconds;
      } catch {
        // Silently fail network hiccups without breaking UI
      }
    },
    [lessonId, status]
  );

  // Manual pause
  const pause = useCallback(async () => {
    setIsPaused(true);
    isPausedRef.current = true;
    await sendSync(activeSecondsRef.current, true);
  }, [sendSync]);

  // Manual resume
  const resume = useCallback(async () => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);
    isIdleRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    await sendSync(activeSecondsRef.current, false);
  }, [sendSync]);

  // Dismiss idle and resume
  const dismissIdle = useCallback(() => {
    resume();
  }, [resume]);

  // Register user activity to reset idle timer
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isIdleRef.current) {
      // If was idle, touching or interacting wakes it up
      setIsIdle(false);
      isIdleRef.current = false;
    }
  }, []);

  // Listen to user interaction events for idle detection
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    let lastRecord = Date.now();
    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle event handlers to run at most once every 2000ms
      if (now - lastRecord > 2000) {
        lastRecord = now;
        recordActivity();
      }
    };

    const events = ["pointerdown", "keydown", "touchstart", "click", "wheel"];
    events.forEach((evt) => window.addEventListener(evt, handleUserInteraction, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
    };
  }, [status, recordActivity]);

  // Handle Tab Visibility (Page Visibility API)
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Tab backgrounded or switched: sync current active time
        sendSync(activeSecondsRef.current, isPausedRef.current);
      } else if (document.visibilityState === "visible") {
        // Tab brought back to front: refresh activity timestamp
        lastActivityRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status, sendSync]);

  // Handle page exit / beforeunload sync
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    const handleBeforeUnload = () => {
      sendSync(activeSecondsRef.current, true, true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also sync on component unmount
      sendSync(activeSecondsRef.current, isPausedRef.current, true);
    };
  }, [status, sendSync]);

  // Main active ticking interval
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    const intervalId = setInterval(() => {
      const isVisible = typeof document !== "undefined" ? document.visibilityState === "visible" : true;
      const now = Date.now();

      // Check if idle timeout exceeded
      if (isVisible && !isPausedRef.current && !isIdleRef.current) {
        if (now - lastActivityRef.current > idleTimeoutMs) {
          setIsIdle(true);
          isIdleRef.current = true;
          sendSync(activeSecondsRef.current, true);
          return;
        }
      }

      // Only increment if active, visible, not paused, not idle
      if (isVisible && !isPausedRef.current && !isIdleRef.current) {
        setActiveSeconds((prev) => {
          const next = prev + 1;
          activeSecondsRef.current = next;
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [status, idleTimeoutMs, sendSync]);

  // Periodic background sync to DB
  useEffect(() => {
    if (status !== "IN_PROGRESS") return;

    const syncIntervalId = setInterval(() => {
      if (Math.abs(activeSecondsRef.current - lastSyncedSecondsRef.current) >= 5) {
        sendSync(activeSecondsRef.current, isPausedRef.current);
      }
    }, syncIntervalMs);

    return () => clearInterval(syncIntervalId);
  }, [status, syncIntervalMs, sendSync]);

  return {
    activeSeconds,
    isPaused,
    isIdle,
    pause,
    resume,
    dismissIdle,
    formatElapsed: (s?: number) => formatLessonTime(typeof s === "number" ? s : activeSeconds),
    syncTime: sendSync,
  };
}
