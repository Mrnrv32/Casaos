"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  token: string;
  isLoggedIn: boolean;
}

export function AcceptInviteButton({ token, isLoggedIn }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.rpc("accept_invitation", {
        p_token: token,
      });
      if (error) throw error;
      router.push("/board");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo unir al hogar");
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-white/50 leading-relaxed">
          Necesitas una cuenta para unirte a este hogar.
        </p>
        <a
          href="/login"
          className="block w-full rounded-xl bg-amber-400 py-3 font-semibold text-black text-center active:scale-[0.98] transition-transform"
        >
          Crear cuenta / Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">
          {error}
        </p>
      )}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        {loading ? "Uniéndose…" : "Unirme al hogar"}
      </button>
    </div>
  );
}
