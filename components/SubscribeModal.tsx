"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, X, CheckCircle2 } from "lucide-react";

const DISMISSED_KEY = "subscribeModalDismissed";
const SCROLL_TRIGGER_RATIO = 0.5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscribeModal() {
  const t = useTranslations("subscribeModal");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    let alreadyHandled = false;
    try {
      alreadyHandled = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      alreadyHandled = false;
    }
    if (alreadyHandled) return;

    const handleScroll = () => {
      if (hasTriggered.current) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const ratio = window.scrollY / scrollable;
      if (ratio >= SCROLL_TRIGGER_RATIO) {
        hasTriggered.current = true;
        setOpen(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // localStorage unavailable — modal may reappear on future visits
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("errorNameRequired"));
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t("errorEmailRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), mobile: mobile.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not subscribe. Please try again.");

      setSuccess(true);
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // localStorage unavailable — modal may reappear on future visits
      }
      setTimeout(() => setOpen(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0 && EMAIL_PATTERN.test(email.trim());

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <button
          type="button"
          onClick={close}
          aria-label={t("closeLabel")}
          className="absolute right-3 top-3 rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <X size={16} />
        </button>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={32} className="text-[var(--color-success)]" />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t("successMessage")}</p>
          </div>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white">
              <Mail size={20} />
            </span>
            <h2 className="mt-3 text-base font-bold text-[var(--color-text-primary)]">{t("title")}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("body")}</p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                  {t("nameLabel")}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                  {t("emailLabel")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                  {t("mobileLabel")}
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t("mobilePlaceholder")}
                  className="w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="w-full rounded-[var(--radius-control)] bg-[var(--color-brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? t("submitting") : t("submitButton")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
