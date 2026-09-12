"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, X } from "lucide-react";

const STORAGE_KEY = "lastSeenActivityAt";
const POLL_INTERVAL_MS = 60_000;

export default function NewContentBanner() {
  const t = useTranslations("newContentBanner");
  const [pendingLatestAt, setPendingLatestAt] = useState<string | null>(null);
  const latestSeenRef = useRef<string | null>(null);
  const dismissedRef = useRef<string | null>(null);

  const checkLatest = useCallback(() => {
    fetch("/api/latest-activity", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ latestAt: string | null }>) : null))
      .then((data) => {
        if (!data?.latestAt) return;

        if (!latestSeenRef.current) {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          latestSeenRef.current = stored ?? data.latestAt;
          if (!stored) window.localStorage.setItem(STORAGE_KEY, data.latestAt);
          return;
        }

        if (
          new Date(data.latestAt) > new Date(latestSeenRef.current) &&
          data.latestAt !== dismissedRef.current
        ) {
          setPendingLatestAt(data.latestAt);
        }
      })
      .catch(() => {
        // transient network error — try again on the next poll
      });
  }, []);

  useEffect(() => {
    checkLatest();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") checkLatest();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") checkLatest();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [checkLatest]);

  const handleRefresh = () => {
    if (pendingLatestAt) {
      try {
        window.localStorage.setItem(STORAGE_KEY, pendingLatestAt);
      } catch {
        // ignore storage errors (private browsing, quota, etc.)
      }
    }
    window.location.reload();
  };

  const handleDismiss = () => {
    dismissedRef.current = pendingLatestAt;
    setPendingLatestAt(null);
  };

  if (!pendingLatestAt) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-[var(--color-brand)] px-4 py-2.5 text-center text-sm font-medium text-white">
      <span>{t("message")}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
        >
          <RefreshCw size={13} /> {t("refreshButton")}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="text-white/80 transition-colors hover:text-white"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
