"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, Copy, Check, ArrowRight } from "lucide-react";

type Step = "create" | "invite";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("create");
  const [homeName, setHomeName] = useState("");
  const [homeId, setHomeId] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_home", {
        p_name: homeName.trim(),
      });
      if (error) throw error;
      setHomeId(data);
      setStep("invite");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo crear el hogar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeId) return;
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("home_invitations")
        .insert({ home_id: homeId, invited_email: partnerEmail.trim() })
        .select("token")
        .single();
      if (error) throw error;
      setInviteUrl(`${window.location.origin}/invite/${data.token}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo generar el enlace");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const goToBoard = () => {
    router.push("/board");
    router.refresh();
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 mb-4">
          <Home className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {step === "create" ? "Crea tu hogar" : "Invita a tu pareja"}
        </h1>
        <p className="mt-1 text-sm text-white/40">
          {step === "create"
            ? "Dale un nombre a su espacio compartido"
            : "Comparte el enlace para que se una"}
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        {step === "create" ? (
          <form onSubmit={handleCreateHome} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 font-medium">
                Nombre del hogar
              </label>
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="Casa García, Nuestro Nido…"
                required
                autoFocus
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !homeName.trim()}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-400 py-3 font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {loading ? (
                "Creando…"
              ) : (
                <>
                  Continuar <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : inviteUrl ? (
          /* Invite link shown */
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
              <p className="text-xs text-white/40 mb-1.5">Enlace de invitación</p>
              <p className="text-sm text-white/70 break-all leading-relaxed">{inviteUrl}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm font-medium text-white active:scale-[0.98] transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar enlace
                </>
              )}
            </button>

            <button
              onClick={goToBoard}
              className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-black active:scale-[0.98] transition-transform"
            >
              Ir al tablero
            </button>
          </div>
        ) : (
          /* Partner email form */
          <form onSubmit={handleCreateInvite} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 font-medium">
                Correo de tu pareja
              </label>
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="pareja@correo.com"
                required
                autoFocus
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/40"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !partnerEmail.trim()}
              className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {loading ? "Generando…" : "Generar enlace"}
            </button>

            <button
              type="button"
              onClick={goToBoard}
              className="text-sm text-white/35 hover:text-white/55 text-center transition-colors py-1"
            >
              Omitir por ahora
            </button>
          </form>
        )}
      </div>

      {/* Step dots */}
      <div className="flex gap-2 mt-6">
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            step === "create" ? "bg-amber-400" : "bg-white/20"
          }`}
        />
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            step === "invite" ? "bg-amber-400" : "bg-white/20"
          }`}
        />
      </div>
    </div>
  );
}
