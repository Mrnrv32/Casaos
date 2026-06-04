"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, Copy, Check, ArrowRight, Users, Link as LinkIcon } from "lucide-react";

type Step = "choose" | "create" | "invite" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("choose");
  const [homeName, setHomeName] = useState("");
  const [homeId, setHomeId] = useState<string | null>(null);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_home", { p_name: homeName.trim() });
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

  const handleJoin = () => {
    const raw = inviteInput.trim();
    if (!raw) return;
    const token = raw.includes("/invite/")
      ? raw.split("/invite/").pop()?.trim()
      : raw;
    if (!token) return;
    router.push(`/invite/${token}`);
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

  // ── Choose ────────────────────────────────────────────────────────────────
  if (step === "choose") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 mb-4">
            <Home className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Configura tu hogar</h1>
          <p className="mt-1 text-sm text-white/40">¿Cómo quieres empezar?</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={() => setStep("create")}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left active:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Crear mi hogar</p>
                <p className="text-xs text-white/40 mt-0.5">Soy el primero en registrarme</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 ml-auto flex-shrink-0" />
            </div>
          </button>

          <button
            onClick={() => setStep("join")}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left active:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Ya tengo hogar</p>
                <p className="text-xs text-white/40 mt-0.5">Me invitaron, tengo un enlace</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 ml-auto flex-shrink-0" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  if (step === "join") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-400/10 mb-4">
            <LinkIcon className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Unirme al hogar</h1>
          <p className="mt-1 text-sm text-white/40">Pega el enlace que te compartieron</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/50 font-medium">Enlace de invitación</label>
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="https://… o solo el código"
              autoFocus
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-blue-400/40 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            disabled={!inviteInput.trim()}
            onClick={handleJoin}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Unirme al hogar <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setStep("choose")}
            className="text-sm text-white/35 hover:text-white/55 text-center transition-colors py-1"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // ── Create home ───────────────────────────────────────────────────────────
  if (step === "create") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 mb-4">
            <Home className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Crea tu hogar</h1>
          <p className="mt-1 text-sm text-white/40">Dale un nombre a su espacio compartido</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
          <form onSubmit={handleCreateHome} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 font-medium">Nombre del hogar</label>
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
              <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !homeName.trim()}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-400 py-3 font-semibold text-black disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {loading ? "Creando…" : <> Continuar <ArrowRight className="w-4 h-4" /> </>}
            </button>

            <button
              type="button"
              onClick={() => setStep("choose")}
              className="text-sm text-white/35 hover:text-white/55 text-center transition-colors py-1"
            >
              Volver
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Invite partner ────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 mb-4">
          <Home className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Invita a tu pareja</h1>
        <p className="mt-1 text-sm text-white/40">Comparte el enlace para que se una</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        {inviteUrl ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
              <p className="text-xs text-white/40 mb-1.5">Enlace de invitación</p>
              <p className="text-sm text-white/70 break-all leading-relaxed">{inviteUrl}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm font-medium text-white active:scale-[0.98] transition-all"
            >
              {copied ? <><Check className="w-4 h-4 text-green-400" /> ¡Copiado!</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
            </button>

            <button
              onClick={goToBoard}
              className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-black active:scale-[0.98] transition-transform"
            >
              Ir al tablero
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/50 font-medium">Correo de tu pareja</label>
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
              <p className="text-sm text-red-400/80 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>
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
    </div>
  );
}
