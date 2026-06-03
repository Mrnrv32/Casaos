"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        router.push("/board");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/board");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
      {/* Logo / Title */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">CasaOS</h1>
        <p className="mt-1 text-sm text-white/40">Tu sistema operativo del hogar</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        {/* Mode toggle */}
        <div className="flex rounded-xl bg-white/[0.05] p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === "signin"
                ? "bg-amber-400 text-black"
                : "text-white/50 hover:text-white"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === "signup"
                ? "bg-amber-400 text-black"
                : "text-white/50 hover:text-white"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 font-medium">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/50 font-medium">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/50 font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-amber-400 py-3 font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading
              ? "..."
              : mode === "signin"
              ? "Entrar"
              : "Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
