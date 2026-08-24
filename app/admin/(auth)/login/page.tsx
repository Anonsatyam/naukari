"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Lock } from "lucide-react";
import { Button } from "@/components/Button";
import Card from "@/components/Card";
import { TextField } from "@/components/FormField";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 2 UI only — no real auth yet. Wired to Supabase Auth in Phase 3.
    router.push("/admin/dashboard");
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
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@biharsarkarinaukri.example"
          />
          <TextField
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" className="w-full">
            <Lock size={14} /> Sign In
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[var(--color-text-muted)]">
          UI preview only — authentication connects to Supabase Auth in Phase 3.
        </p>
      </Card>
    </div>
  );
}
