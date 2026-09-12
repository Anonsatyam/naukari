"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";

const DISMISSED_KEY = "pwaInstallDismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const t = useTranslations("pwaInstall");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner] = useState(() => !isStandalone() && isIos());
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage unavailable — banner just won't stay dismissed across visits
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || (!deferredPrompt && !showIosBanner)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm sm:rounded-[var(--radius-card)] sm:border">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand)] text-white">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t("title")}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {deferredPrompt ? t("body") : t("iosBody")}
          </p>
          {deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 rounded-[var(--radius-control)] bg-[var(--color-brand)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-hover)]"
            >
              {t("installButton")}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismissLabel")}
          className="shrink-0 rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
