"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Check, Copy, LogOut, Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { usePushNotifications } from "@/hooks/use-push-notifications";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SettingsClient() {
  const { homeId, userId, userEmail, fullName, setFullName, homeName } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(fullName);
  const [editingHomeName, setEditingHomeName] = useState(false);
  const [homeNameValue, setHomeNameValue] = useState(homeName);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: partner } = useQuery({
    queryKey: ["partner", homeId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("home_id", homeId)
        .neq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["invitations", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_invitations")
        .select("id, invited_email, token, status")
        .eq("home_id", homeId)
        .eq("status", "pending");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, name) => {
      setFullName(name);
      setEditingName(false);
      toast.success("Nombre actualizado");
    },
    onError: () => toast.error("Error al actualizar nombre"),
  });

  const updateHomeName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("homes")
        .update({ name })
        .eq("id", homeId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingHomeName(false);
      toast.success("Nombre del hogar actualizado");
    },
    onError: () => toast.error("Error al actualizar nombre del hogar"),
  });

  const createInvite = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase
        .from("home_invitations")
        .insert({ home_id: homeId, invited_email: email })
        .select("token")
        .single();
      if (error) throw error;
      return data.token as string;
    },
    onSuccess: (token) => {
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
      setInviteEmail("");
      setShowInviteForm(false);
      queryClient.invalidateQueries({ queryKey: ["invitations", homeId] });
      toast.success("Invitación creada");
    },
    onError: () => toast.error("Error al crear invitación"),
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("home_invitations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", homeId] });
      toast.success("Invitación cancelada");
    },
    onError: () => toast.error("Error al cancelar invitación"),
  });

  const push = usePushNotifications();

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => router.push("/login"),
    onError: () => toast.error("Error al cerrar sesión"),
  });

  return (
    <div className="flex flex-col px-4 pt-6 pb-10 space-y-6 overflow-y-auto">
      <h1 className="text-xl font-bold text-white">Ajustes</h1>

      {/* Perfil */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest px-1">
          Perfil
        </p>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="w-12 h-12 rounded-full bg-amber-400/15 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-400 font-semibold text-sm">
                {initials(fullName)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="flex-1 min-w-0 bg-[#0f0f0f] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-amber-400/50"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nameValue.trim())
                        updateName.mutate(nameValue.trim());
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameValue(fullName);
                      }
                    }}
                  />
                  <button
                    className="p-1.5 text-amber-400 flex-shrink-0"
                    onClick={() => nameValue.trim() && updateName.mutate(nameValue.trim())}
                    disabled={updateName.isPending}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    className="p-1.5 text-white/40 flex-shrink-0"
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(fullName);
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-medium truncate">
                    {fullName}
                  </span>
                  <button
                    className="p-1 text-white/25 hover:text-white/60"
                    onClick={() => {
                      setEditingName(true);
                      setNameValue(fullName);
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <p className="text-xs text-white/40 mt-0.5 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hogar */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest px-1">
          Hogar
        </p>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.06]">
          {/* Home name row */}
          <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
            <span className="text-sm text-white/50 w-20 flex-shrink-0">Nombre</span>
            {editingHomeName ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  autoFocus
                  className="flex-1 min-w-0 bg-[#0f0f0f] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-amber-400/50"
                  value={homeNameValue}
                  onChange={(e) => setHomeNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && homeNameValue.trim())
                      updateHomeName.mutate(homeNameValue.trim());
                    if (e.key === "Escape") {
                      setEditingHomeName(false);
                      setHomeNameValue(homeName);
                    }
                  }}
                />
                <button
                  className="p-1.5 text-amber-400 flex-shrink-0"
                  onClick={() =>
                    homeNameValue.trim() && updateHomeName.mutate(homeNameValue.trim())
                  }
                  disabled={updateHomeName.isPending}
                >
                  <Check size={15} />
                </button>
                <button
                  className="p-1.5 text-white/40 flex-shrink-0"
                  onClick={() => {
                    setEditingHomeName(false);
                    setHomeNameValue(homeName);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-white text-sm flex-1 truncate">
                  {homeNameValue}
                </span>
                <button
                  className="p-1 text-white/25 hover:text-white/60 flex-shrink-0"
                  onClick={() => {
                    setEditingHomeName(true);
                    setHomeNameValue(homeName);
                  }}
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Partner row */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between min-h-[28px]">
              <span className="text-sm text-white/50">Pareja</span>
              {partner ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-400/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-[10px] font-semibold">
                      {initials(partner.full_name)}
                    </span>
                  </div>
                  <span className="text-white text-sm">{partner.full_name}</span>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1.5 text-amber-400 text-sm"
                  onClick={() => setShowInviteForm(true)}
                >
                  <UserPlus size={14} />
                  Invitar
                </button>
              )}
            </div>

            {/* Pending invitations */}
            {pendingInvites.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between bg-[#0f0f0f] rounded-xl px-3 py-2"
                  >
                    <div>
                      <p className="text-xs text-white/70">{inv.invited_email}</p>
                      <p className="text-[10px] text-amber-400/70 mt-0.5">Pendiente</p>
                    </div>
                    <button
                      className="p-1.5 text-white/25 hover:text-red-400"
                      onClick={() => cancelInvite.mutate(inv.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Generated invite link */}
            {inviteLink && (
              <div className="mt-3 bg-[#0f0f0f] rounded-xl px-3 py-3">
                <p className="text-[10px] text-white/40 mb-1.5">Link de invitación</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white/60 flex-1 truncate">{inviteLink}</p>
                  <button
                    className="p-1.5 text-amber-400 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Link copiado");
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Notificaciones */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest px-1">
          Notificaciones
        </p>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.06] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                {push.status === "on" ? (
                  <BellRing size={16} className="text-amber-400" />
                ) : (
                  <Bell size={16} className="text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">Push en este dispositivo</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {push.status === "on" && "Te avisaremos aunque la app esté cerrada"}
                  {push.status === "off" && "Entérate cuando tu pareja agregue algo"}
                  {push.status === "loading" && "Verificando…"}
                  {push.status === "no-sw" &&
                    (push.needsInstall
                      ? "Primero instala la app: Compartir → Agregar a inicio"
                      : "Disponible en la app instalada (producción)")}
                  {push.status === "denied" && "Bloqueadas — habilítalas en los ajustes del navegador"}
                  {push.status === "unsupported" && "Tu navegador no soporta notificaciones push"}
                </p>
              </div>
            </div>
            {(push.status === "on" || push.status === "off") && (
              <button
                disabled={push.busy}
                onClick={async () => {
                  if (push.status === "on") {
                    await push.disable();
                    toast.success("Push desactivado");
                  } else {
                    const ok = await push.enable();
                    if (ok) toast.success("Push activado en este dispositivo");
                    else toast.error("No se pudo activar");
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${
                  push.status === "on" ? "bg-amber-400" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    push.status === "on" ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sesión */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest px-1">
          Sesión
        </p>
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.06] overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-4 py-4 text-red-400 active:bg-white/5 transition-colors"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            <LogOut size={17} />
            <span className="text-sm font-medium">
              {signOut.isPending ? "Cerrando sesión..." : "Cerrar sesión"}
            </span>
          </button>
        </div>
      </section>

      <p className="text-center text-[11px] text-white/15 pt-2">CasaOS v1.0</p>

      {/* Invite overlay */}
      {showInviteForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowInviteForm(false)}
        >
          <div
            className="w-full max-w-[440px] bg-[#1c1c1c] rounded-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold text-base">Invitar a tu hogar</h3>
            <input
              autoFocus
              type="email"
              placeholder="Email de tu pareja"
              className="w-full bg-[#0f0f0f] text-white text-sm rounded-xl px-4 py-3 border border-white/10 outline-none focus:border-amber-400/50 placeholder:text-white/30"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inviteEmail.trim())
                  createInvite.mutate(inviteEmail.trim());
              }}
            />
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm"
                onClick={() => setShowInviteForm(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3 rounded-xl bg-amber-400 text-black font-semibold text-sm disabled:opacity-40"
                onClick={() =>
                  inviteEmail.trim() && createInvite.mutate(inviteEmail.trim())
                }
                disabled={!inviteEmail.trim() || createInvite.isPending}
              >
                {createInvite.isPending ? "Enviando..." : "Invitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
