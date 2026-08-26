"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/Button";
import Card from "@/components/Card";
import { TextField } from "@/components/FormField";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign in failed. Please try again.");
        setLoading(false);
        return;
      }

      const redirectTo = searchParams.get("from") || "/admin/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <Card padding="p-7" className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
            <Landmark size={20} />
          </span>
          <h1 className="font-display mt-3 text-lg font-bold text-[var(--color-text-primary)]">
            Admin Sign In
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Bihar Sarkari Naukri — admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--color-danger-tint)] p-3 text-sm text-[var(--color-danger)]">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            <Lock size={14} /> {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[var(--color-text-muted)]">
          Single admin account for now — set ADMIN_PASSWORD in your environment.
        </p>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
