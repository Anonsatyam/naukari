"use client";

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/Button";

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
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={trigger}
        disabled={state === "loading"}
      >
        <Play size={14} />
        {state === "loading" ? "Triggering…" : "Run Bot Now"}
      </Button>

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
