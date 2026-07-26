import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Search = { next?: string };

function isSafeNext(value: string | undefined): value is string {
  return !!value && value.startsWith("/") && !value.startsWith("//");
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Radiocom Analytics Hub" },
      { name: "description", content: "Sign in to access Radiocom marketing analytics." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const safeNext = isSafeNext(next) ? next : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) window.location.assign(safeNext);
    });
    return () => {
      mounted = false;
    };
  }, [safeNext]);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    const origin = window.location.origin;
    const redirectUri = `${origin}/auth?next=${encodeURIComponent(safeNext)}`;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    if (result.error) {
      setBusy(false);
      setError(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    window.location.assign(safeNext);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth?next=${encodeURIComponent(safeNext)}`;
    const { error: err } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
        : await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    if (mode === "signin") {
      navigate({ to: safeNext });
    } else {
      setBusy(false);
      setError("Check your email to confirm your account.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access Radiocom Analytics Hub and its agent integrations.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="mt-5 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs uppercase text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
