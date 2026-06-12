"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  ChevronRight,
  Settings2,
  FolderKanban,
  CheckSquare,
  ChefHat,
  ShoppingCart,
  Heart,
  StickyNote,
  CheckCircle2,
  Circle,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { NotificationsBell } from "@/components/notifications-bell";
import { cn } from "@/lib/utils";
import type { BoardCard, Chore, ChoreRecurrence } from "@/types/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttentionItem = {
  due_at: string;
  kind: string;
  link: string;
  priority: number;
  subtitle: string;
  title: string;
};

type SubTab = "tablero" | "tareas";

// ─── Source config ────────────────────────────────────────────────────────────

type SourceConfig = {
  Icon: React.ElementType;
  chipClass: string;
  labelClass: string;
  cardClass: string;
  label: string;
};

const SOURCE_CONFIG: Record<string, SourceConfig> = {
  project: {
    Icon: FolderKanban,
    chipClass: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    labelClass: "text-blue-400",
    cardClass: "bg-[#1a1a1a] border-blue-500/10",
    label: "Proyecto",
  },
  task: {
    Icon: CheckSquare,
    chipClass: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    labelClass: "text-violet-400",
    cardClass: "bg-[#1a1a1a] border-violet-500/10",
    label: "Tarea",
  },
  recipe: {
    Icon: ChefHat,
    chipClass: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    labelClass: "text-orange-400",
    cardClass: "bg-[#1a1a1a] border-orange-500/10",
    label: "Receta",
  },
  pantry: {
    Icon: ShoppingCart,
    chipClass: "bg-green-500/15 text-green-400 border-green-500/20",
    labelClass: "text-green-400",
    cardClass: "bg-[#1a1a1a] border-green-500/10",
    label: "Compras",
  },
  moment: {
    Icon: Heart,
    chipClass: "bg-pink-500/15 text-pink-400 border-pink-500/20",
    labelClass: "text-pink-400",
    cardClass: "bg-[#1a1a1a] border-pink-500/10",
    label: "Momento",
  },
};

const FREEFORM_CONFIG: SourceConfig = {
  Icon: StickyNote,
  chipClass: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  labelClass: "text-amber-400",
  cardClass: "bg-amber-950/20 border-amber-500/10",
  label: "Nota",
};

function getSourceConfig(source: string | null | undefined): SourceConfig {
  return source ? (SOURCE_CONFIG[source] ?? FREEFORM_CONFIG) : FREEFORM_CONFIG;
}

// ─── Recurrence ───────────────────────────────────────────────────────────────

const RECURRENCE_LABELS: Record<ChoreRecurrence, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  once: "Única vez",
};

const RECURRENCE_OPTIONS: ChoreRecurrence[] = ["daily", "weekly", "biweekly", "monthly", "once"];

// ─── Main component ───────────────────────────────────────────────────────────

export function BoardClient() {
  const { homeId, userId, homeName } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [subTab, setSubTab] = useState<SubTab>("tablero");
  const [tabVisible, setTabVisible] = useState(true);
  const [lastPinnedId, setLastPinnedId] = useState<string | null>(null);

  // Board form state
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [boardContent, setBoardContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tareas form state
  const [showTareasForm, setShowTareasForm] = useState(false);
  const [choreTitle, setChoreTitle] = useState("");
  const [choreRecurrence, setChoreRecurrence] = useState<ChoreRecurrence | "">("");
  const [assignedTo, setAssignedTo] = useState<"me" | "partner" | "">("");

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["board_cards", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_cards")
        .select("*")
        .eq("home_id", homeId)
        .neq("status", "dismissed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BoardCard[];
    },
  });

  const { data: attention = [], isLoading: attentionLoading } = useQuery({
    queryKey: ["home_attention", homeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_home_attention");
      if (error) throw error;
      return (data ?? []) as AttentionItem[];
    },
    staleTime: 60_000,
  });

  const { data: chores = [], isLoading: choresLoading } = useQuery({
    queryKey: ["chores", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chores")
        .select("*")
        .eq("home_id", homeId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Chore[];
    },
  });

  const { data: completionsToday = {} } = useQuery({
    queryKey: ["chore_completions_today", homeId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("chore_completions")
        .select("id, chore_id")
        .eq("home_id", homeId)
        .gte("completed_at", today.toISOString());
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((c) => [c.chore_id, c.id])
      ) as Record<string, string>;
    },
  });

  const { data: members = {} } = useQuery({
    queryKey: ["home_members", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("home_id", homeId);
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((p) => [p.id, p.full_name])
      ) as Record<string, string>;
    },
    staleTime: 60_000,
  });

  // ─── Realtime ──────────────────────────────────────────────────────────────

  useRealtimeInvalidate({
    channel: "board_cards",
    filter: homeId,
    queryKey: ["board_cards", homeId],
    tables: ["board_cards"],
  });

  useRealtimeInvalidate({
    channel: "chores",
    filter: homeId,
    queryKey: ["chores", homeId],
    tables: ["chores"],
  });

  useRealtimeInvalidate({
    channel: "chore_completions",
    filter: homeId,
    queryKey: ["chore_completions_today", homeId],
    tables: ["chore_completions"],
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const addCard = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("board_cards").insert({
        content: text,
        home_id: homeId,
        created_by: userId,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBoardContent("");
      setShowBoardForm(false);
      queryClient.invalidateQueries({ queryKey: ["board_cards", homeId] });
    },
    onError: () => toast.error("No se pudo agregar la nota"),
  });

  const dismissCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("board_cards")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["board_cards", homeId] }),
    onError: () => toast.error("Error al descartar"),
  });

  const toggleComplete = useMutation({
    mutationFn: async (chore: Chore) => {
      const completionId = completionsToday[chore.id];
      if (completionId) {
        const { error } = await supabase
          .from("chore_completions")
          .delete()
          .eq("id", completionId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chore_completions").insert({
          chore_id: chore.id,
          home_id: homeId,
          completed_by: userId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["chore_completions_today", homeId] }),
    onError: () => toast.error("No se pudo actualizar la tarea"),
  });

  const addToBoard = useMutation({
    mutationFn: async (chore: Chore) => {
      const { error } = await supabase.from("board_cards").insert({
        content: chore.title,
        home_id: homeId,
        created_by: userId,
        source: "task",
        source_id: chore.id,
        source_url: "/board",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: (_, chore) => {
      setLastPinnedId(chore.id);
      setTimeout(() => setLastPinnedId(null), 1500);
      toast.success("Agregado al tablero");
    },
    onError: () => toast.error("No se pudo agregar al tablero"),
  });

  const addChore = useMutation({
    mutationFn: async () => {
      const partnerEntry = Object.entries(members).find(([id]) => id !== userId);
      const partnerId = partnerEntry?.[0];
      const assignedToId =
        assignedTo === "me"
          ? userId
          : assignedTo === "partner"
          ? (partnerId ?? null)
          : null;
      const { error } = await supabase.from("chores").insert({
        title: choreTitle.trim(),
        home_id: homeId,
        created_by: userId,
        is_active: true,
        recurrence: choreRecurrence || null,
        assigned_to: assignedToId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setChoreTitle("");
      setChoreRecurrence("");
      setAssignedTo("");
      setShowTareasForm(false);
      queryClient.invalidateQueries({ queryKey: ["chores", homeId] });
    },
    onError: () => toast.error("No se pudo agregar la tarea"),
  });

  const deleteChore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chores")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["chores", homeId] }),
    onError: () => toast.error("No se pudo eliminar la tarea"),
  });

  // ─── Derived ───────────────────────────────────────────────────────────────

  const partnerEntry = Object.entries(members).find(([id]) => id !== userId);
  const partnerName = partnerEntry?.[1];

  const pendingChores = chores.filter((c) => !completionsToday[c.id]);
  const doneChores = chores.filter((c) => !!completionsToday[c.id]);
  const pendingCount = pendingChores.length;

  const boardIsEmpty =
    !cardsLoading && !attentionLoading && cards.length === 0 && attention.length === 0;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSubTabChange = (tab: SubTab) => {
    if (tab === subTab) return;
    setTabVisible(false);
    setTimeout(() => {
      setSubTab(tab);
      setTabVisible(true);
    }, 100);
  };

  const handleBoardSubmit = () => {
    const trimmed = boardContent.trim();
    if (!trimmed) return;
    addCard.mutate(trimmed);
  };

  const toggleBoardForm = () => {
    setShowBoardForm((v) => !v);
    if (!showBoardForm) setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Inicio</h1>
          {subTab === "tablero" ? (
            <p className="text-sm text-white/40">{homeName}</p>
          ) : pendingCount > 0 ? (
            <p className="text-sm text-white/40">
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </p>
          ) : chores.length > 0 ? (
            <p className="text-sm text-emerald-400/70">Todo listo por hoy</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] text-white/60 active:bg-white/[0.10] transition-colors"
          >
            <Settings2 className="w-5 h-5" />
          </Link>
          {subTab === "tablero" && (
            <button
              onClick={toggleBoardForm}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                showBoardForm
                  ? "bg-amber-400/20 text-amber-400"
                  : "bg-white/[0.06] text-white/60 active:bg-white/[0.10]"
              )}
            >
              <Plus
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  showBoardForm && "rotate-45"
                )}
              />
            </button>
          )}
          {subTab === "tareas" && (
            <button
              onClick={() => setShowTareasForm((v) => !v)}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                showTareasForm
                  ? "bg-amber-400/20 text-amber-400"
                  : "bg-white/[0.06] text-white/60 active:bg-white/[0.10]"
              )}
            >
              <Plus
                className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  showTareasForm && "rotate-45"
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab pill */}
      <div className="flex gap-1 mb-4 p-1 bg-white/[0.04] rounded-xl self-start">
        <SubTabButton active={subTab === "tablero"} onClick={() => handleSubTabChange("tablero")}>
          Tablero
        </SubTabButton>
        <SubTabButton active={subTab === "tareas"} onClick={() => handleSubTabChange("tareas")}>
          Tareas
          {pendingCount > 0 && (
            <span
              className={cn(
                "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                subTab === "tareas"
                  ? "bg-amber-400 text-black"
                  : "bg-white/20 text-white/70"
              )}
            >
              {pendingCount}
            </span>
          )}
        </SubTabButton>
      </div>

      {/* ── TABLERO SUB-TAB ── */}
      {subTab === "tablero" && (
        <div className={cn("flex-1 overflow-y-auto transition-all duration-200", tabVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1")}>
          {/* Add card form */}
          {showBoardForm && (
            <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={boardContent}
                onChange={(e) => setBoardContent(e.target.value)}
                placeholder="Escribe una nota para el hogar..."
                rows={3}
                className="w-full bg-transparent text-white text-sm placeholder:text-white/25 resize-none outline-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBoardSubmit();
                }}
              />
              <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowBoardForm(false);
                    setBoardContent("");
                  }}
                  className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
                >
                  Cancelar
                </button>
                <button
                  disabled={!boardContent.trim() || addCard.isPending}
                  onClick={handleBoardSubmit}
                  className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
                >
                  {addCard.isPending ? "Guardando…" : "Agregar"}
                </button>
              </div>
            </div>
          )}

          {/* Attention items — full width */}
          {attention.length > 0 && (
            <section className="mb-4">
              <SectionLabel>Atención</SectionLabel>
              <div className="space-y-2">
                {attention.map((item, i) => (
                  <AttentionCard key={i} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Board cards — 2-column CSS masonry */}
          {cards.length > 0 && (
            <section>
              {attention.length > 0 && <SectionLabel>Notas</SectionLabel>}
              <div className="columns-2 gap-2">
                {cards.map((card) => (
                  <BoardCardItem
                    key={card.id}
                    card={card}
                    onDismiss={() => dismissCard.mutate(card.id)}
                    dismissing={
                      dismissCard.isPending && dismissCard.variables === card.id
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {boardIsEmpty && (
            <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
              <StickyNote className="w-10 h-10 text-white/10" />
              <div>
                <p className="text-white/30 text-sm">Nada en el tablero</p>
                <p className="text-white/20 text-xs mt-1">Agrega notas o fija ítems desde otras secciones</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {(cardsLoading || attentionLoading) &&
            cards.length === 0 &&
            attention.length === 0 && (
              <div className="columns-2 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="break-inside-avoid mb-2 h-20 bg-white/[0.04] rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── TAREAS SUB-TAB ── */}
      {subTab === "tareas" && (
        <div className={cn("flex-1 overflow-y-auto transition-all duration-200", tabVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1")}>
          {/* Add chore form */}
          {showTareasForm && (
            <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                value={choreTitle}
                onChange={(e) => setChoreTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && choreTitle.trim()) addChore.mutate();
                }}
                placeholder="Nombre de la tarea…"
                className="w-full bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
              />
              {/* Recurrence pills */}
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() =>
                      setChoreRecurrence(choreRecurrence === r ? "" : r)
                    }
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                      choreRecurrence === r
                        ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                        : "bg-transparent border-white/[0.10] text-white/40"
                    )}
                  >
                    {RECURRENCE_LABELS[r]}
                  </button>
                ))}
              </div>
              {/* Assign pills */}
              <div className="flex gap-1.5">
                <Chip
                  label="Yo"
                  active={assignedTo === "me"}
                  onClick={() => setAssignedTo(assignedTo === "me" ? "" : "me")}
                />
                {partnerName && (
                  <Chip
                    label={partnerName}
                    active={assignedTo === "partner"}
                    onClick={() =>
                      setAssignedTo(assignedTo === "partner" ? "" : "partner")
                    }
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowTareasForm(false);
                    setChoreTitle("");
                    setChoreRecurrence("");
                    setAssignedTo("");
                  }}
                  className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
                >
                  Cancelar
                </button>
                <button
                  disabled={!choreTitle.trim() || addChore.isPending}
                  onClick={() => addChore.mutate()}
                  className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
                >
                  {addChore.isPending ? "Guardando…" : "Agregar"}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {choresLoading && chores.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!choresLoading && chores.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-white/30 text-sm">No hay tareas aún</p>
              <p className="text-white/20 text-xs mt-1">Toca el + para agregar una</p>
            </div>
          )}

          {/* Pendientes */}
          {pendingChores.length > 0 && (
            <section>
              <SectionLabel>Pendientes</SectionLabel>
              <div className="space-y-2">
                {pendingChores.map((chore) => (
                  <ChoreItem
                    key={chore.id}
                    chore={chore}
                    completed={false}
                    assignedName={
                      chore.assigned_to ? members[chore.assigned_to] : undefined
                    }
                    onToggle={() => toggleComplete.mutate(chore)}
                    onAddToBoard={() => addToBoard.mutate(chore)}
                    onDelete={() => deleteChore.mutate(chore.id)}
                    toggling={
                      toggleComplete.isPending &&
                      toggleComplete.variables?.id === chore.id
                    }
                    pinning={
                      addToBoard.isPending && addToBoard.variables?.id === chore.id
                    }
                    pinned={lastPinnedId === chore.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completadas hoy */}
          {doneChores.length > 0 && (
            <section className={cn(pendingChores.length > 0 && "mt-4")}>
              <SectionLabel>Completadas hoy</SectionLabel>
              <div className="space-y-2">
                {doneChores.map((chore) => (
                  <ChoreItem
                    key={chore.id}
                    chore={chore}
                    completed={true}
                    assignedName={
                      chore.assigned_to ? members[chore.assigned_to] : undefined
                    }
                    onToggle={() => toggleComplete.mutate(chore)}
                    onAddToBoard={() => addToBoard.mutate(chore)}
                    onDelete={() => deleteChore.mutate(chore.id)}
                    toggling={
                      toggleComplete.isPending &&
                      toggleComplete.variables?.id === chore.id
                    }
                    pinning={
                      addToBoard.isPending && addToBoard.variables?.id === chore.id
                    }
                    pinned={lastPinnedId === chore.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center text-sm px-3.5 py-1.5 rounded-lg font-medium transition-colors",
        active
          ? "bg-white/[0.10] text-white"
          : "text-white/40 active:text-white/60"
      )}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 px-0.5">
      {children}
    </p>
  );
}

function BoardCardItem({
  card,
  onDismiss,
  dismissing,
}: {
  card: BoardCard;
  onDismiss: () => void;
  dismissing: boolean;
}) {
  const cfg = getSourceConfig(card.source);
  const { Icon, chipClass, cardClass } = cfg;

  return (
    <div
      className={cn(
        "break-inside-avoid mb-2 rounded-xl border p-3 transition-opacity",
        cardClass,
        dismissing && "opacity-40"
      )}
    >
      {/* Source chip */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium",
            chipClass
          )}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
        <button
          onClick={onDismiss}
          disabled={dismissing}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white/20 active:text-white/60 active:bg-white/[0.06] transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-white/80 leading-relaxed">{card.content}</p>

      {/* "Ver →" link */}
      {card.source_url && (
        <a
          href={card.source_url}
          className="inline-flex items-center gap-1 mt-2 text-[11px] text-white/35 active:text-white/60 transition-colors"
        >
          Ver <ChevronRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
          : "bg-transparent border-white/[0.10] text-white/40"
      )}
    >
      {label}
    </button>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const accentColor =
    item.priority === 1
      ? "text-red-400"
      : item.priority === 2
      ? "text-amber-400"
      : "text-white/70";

  const dotColor =
    item.priority === 1
      ? "bg-red-400"
      : item.priority === 2
      ? "bg-amber-400"
      : "bg-white/30";

  const inner = (
    <div className="flex items-center gap-3">
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5", dotColor)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", accentColor)}>{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-white/30 truncate mt-0.5">{item.subtitle}</p>
        )}
      </div>
      {item.link && <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
    </div>
  );

  const className =
    "block bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 active:opacity-70 transition-opacity";

  if (item.link) {
    return (
      <a href={item.link} className={className}>
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

function ChoreItem({
  chore,
  completed,
  assignedName,
  onToggle,
  onAddToBoard,
  onDelete,
  toggling,
  pinning,
  pinned,
}: {
  chore: Chore;
  completed: boolean;
  assignedName: string | undefined;
  onToggle: () => void;
  onAddToBoard: () => void;
  onDelete: () => void;
  toggling: boolean;
  pinning: boolean;
  pinned: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[#1a1a1a] rounded-xl border border-white/[0.06] px-3 py-2.5 transition-opacity",
        completed && "opacity-50"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          disabled={toggling}
          className="flex-shrink-0 active:scale-90 transition-transform"
        >
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-white/20" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm text-white/80 truncate",
              completed && "line-through text-white/40"
            )}
          >
            {chore.title}
          </p>
          {(chore.recurrence || assignedName) && (
            <div className="flex items-center gap-2 mt-0.5">
              {chore.recurrence && (
                <span className="text-[10px] text-white/25 uppercase tracking-wide">
                  {RECURRENCE_LABELS[chore.recurrence as ChoreRecurrence] ??
                    chore.recurrence}
                </span>
              )}
              {assignedName && (
                <span className="text-[10px] text-white/25">{assignedName}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onAddToBoard}
            disabled={pinning}
            title="Agregar al tablero"
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40",
              pinned ? "text-amber-400" : "text-white/20 active:text-amber-400"
            )}
          >
            {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDelete}
            title="Eliminar tarea"
            className="w-7 h-7 flex items-center justify-center text-white/20 active:text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
