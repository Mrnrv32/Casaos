"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, X, Wallet, CalendarDays, Heart, CheckSquare,
  StickyNote, ShoppingCart, ChefHat, FolderKanban, AlarmClock,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/supabase";

const KIND_ICONS: Record<string, React.ElementType> = {
  finance: Wallet,
  event: CalendarDays,
  moment: Heart,
  task: CheckSquare,
  note: StickyNote,
  pantry: ShoppingCart,
  recipe: ChefHat,
  project: FolderKanban,
  reminder: AlarmClock,
};

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function NotificationsBell() {
  const { userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [unseenIds, setUnseenIds] = useState<Set<string>>(new Set());

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!userId,
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
    onError: () => toast.error("No se pudo actualizar"),
  });

  function openPanel() {
    setUnseenIds(new Set(notifications.filter((n) => !n.read_at).map((n) => n.id)));
    setOpen(true);
    if (unreadCount > 0) markAllRead.mutate();
  }

  function goTo(n: Notification) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <>
      <button
        onClick={openPanel}
        className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] text-white/60 active:bg-white/[0.10] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative bg-[#1c1c1c] rounded-2xl w-full max-w-[380px] shadow-2xl border border-white/[0.06] flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
              <h2 className="text-base font-semibold text-white">Notificaciones</h2>
              <button onClick={() => setOpen(false)} className="text-white/40">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12">
                  <Bell size={28} className="text-white/15" />
                  <p className="text-[13px] text-white/30">Sin notificaciones aún</p>
                  <p className="text-[11px] text-white/20">
                    Aquí verás lo que agregue tu pareja
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {notifications.map((n) => {
                    const Icon = KIND_ICONS[n.kind] ?? Bell;
                    const isNew = unseenIds.has(n.id);
                    return (
                      <button
                        key={n.id}
                        onClick={() => goTo(n)}
                        className={cn(
                          "w-full flex items-start gap-3 px-5 py-3 text-left active:bg-white/[0.04] transition-colors",
                          isNew && "bg-amber-400/[0.04]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            isNew ? "bg-amber-400/15 text-amber-400" : "bg-white/[0.06] text-white/35"
                          )}
                        >
                          <Icon size={15} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={cn("block text-[13px] leading-snug", isNew ? "text-white/90" : "text-white/55")}>
                            {n.title}
                          </span>
                          {n.body && (
                            <span className="block text-[11px] text-white/30 mt-0.5">{n.body}</span>
                          )}
                          <span className="block text-[10px] text-white/20 mt-1">
                            {n.created_at ? timeAgo(n.created_at) : ""}
                          </span>
                        </span>
                        {isNew && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
