"use client";

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";

type State = "idle" | "loading" | "success" | "error";

export default function TriggerBotButton() {
  const [state, setState] = useState<State>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const trigger = async () => {
    setState("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/bot/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorMessage(data.error ?? "Trigger failed.");
      }
    } catch {
      setState("error");
      setErrorMessage("Could not reach the server.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={trigger}
        disabled={state === "loading"}
        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-success)] px-3 py-1.5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play size={14} className="text-white" />
        {state === "loading" ? "Triggering…" : "Run Bot Now"}
      </button>

      {state === "success" && (
        <p className="mt-2 text-xs text-[var(--color-success)]">
          Triggered — a new run should appear on{" "}
          <a
            href="https://github.com/Anonsatyam/naukari/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            GitHub Actions <ExternalLink size={11} />
          </a>{" "}
          within a few seconds, and this dashboard&apos;s &quot;Last Bot Run&quot; card once it
          finishes (usually 2–3 minutes).
        </p>
      )}
      {state === "error" && (
        <p className="mt-2 text-xs text-[var(--color-danger)]">{errorMessage}</p>
      )}
    </div>
  );
}
