"use client";

import { useEffect, useState } from "react";

// Renders an ISO timestamp in the *viewer's own browser* timezone,
// not the server's — lib/utils.ts's formatDateTime runs during server
// rendering (Vercel's server clock, typically UTC), which showed the
// same moment in time but at the wrong hour for anyone actually in
// IST. Formatting happens after mount (client-side Intl defaults to
// the browser's own system timezone) rather than during the initial
// render, so the server-rendered HTML and the first client render
// match exactly (both show the placeholder) — avoiding a hydration
// mismatch, at the cost of a brief flash before the real time fills
// in.
export default function LocalDateTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date(iso);
    const formatted = Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    // Deliberately client-only: this is the standard escape hatch for
    // "render nothing meaningful during SSR, fill in a browser-only
    // value once mounted" — needed here specifically because the
    // formatted value depends on the *viewer's* timezone, which the
    // server has no way to know. The effect only sets this one value,
    // not a general substitute for computing it during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(formatted);
  }, [iso]);

  return <>{text ?? "—"}</>;
}
