"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { Chore, ChoreRecurrence } from "@/types/supabase";

const RECURRENCE_LABELS: Record<ChoreRecurrence, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  once: "Única vez",
};

const RECURRENCE_OPTIONS: ChoreRecurrence[] = ["daily", "weekly", "biweekly", "monthly", "once"];

export function TareasClient() {
  const { homeId, userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [recurrence, setRecurrence] = useState<ChoreRecurrence | "">("");
  const [assignedTo, setAssignedTo] = useState<"me" | "partner" | "">("");

  const { data: chores = [], isLoading } = useQuery({
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
      return Object.fromEntries((data ?? []).map((c) => [c.chore_id, c.id])) as Record<string, string>;
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
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name])) as Record<string, string>;
    },
    staleTime: 60_000,
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

  const partnerEntry = Object.entries(members).find(([id]) => id !== userId);
  const partnerId = partnerEntry?.[0];
  const partnerName = partnerEntry?.[1];

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
        const { error } = await supabase
          .from("chore_completions")
          .insert({ chore_id: chore.id, home_id: homeId, completed_by: userId });
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
        source_url: "/tareas",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Agregado al tablero"),
    onError: () => toast.error("No se pudo agregar al tablero"),
  });

  const addChore = useMutation({
    mutationFn: async () => {
      const assignedToId =
        assignedTo === "me" ? userId :
        assignedTo === "partner" ? (partnerId ?? null) :
        null;
      const { error } = await supabase.from("chores").insert({
        title: title.trim(),
        home_id: homeId,
        created_by: userId,
        is_active: true,
        recurrence: recurrence || null,
        assigned_to: assignedToId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setRecurrence("");
      setAssignedTo("");
      setShowForm(false);
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

  const pending = chores.filter((c) => !completionsToday[c.id]);
  const done = chores.filter((c) => !!completionsToday[c.id]);

  const subtitle =
    pending.length > 0
      ? `${pending.length} pendiente${pending.length !== 1 ? "s" : ""}`
      : chores.length > 0
      ? "Todo listo por hoy"
      : null;

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Tareas</h1>
          {subtitle && <p className="text-sm text-white/40">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
            showForm
              ? "bg-amber-400/20 text-amber-400"
              : "bg-white/[0.06] text-white/60 active:bg-white/[0.10]"
          )}
        >
          <Plus
            className={cn("w-5 h-5 transition-transform duration-200", showForm && "rotate-45")}
          />
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) addChore.mutate();
            }}
            placeholder="Nombre de la tarea…"
            className="w-full bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
          />
          {/* Recurrence pills */}
          <div className="flex flex-wrap gap-1.5">
            {RECURRENCE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRecurrence(recurrence === r ? "" : r)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  recurrence === r
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
                onClick={() => setAssignedTo(assignedTo === "partner" ? "" : "partner")}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
            <button
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setRecurrence("");
                setAssignedTo("");
              }}
              className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
            >
              Cancelar
            </button>
            <button
              disabled={!title.trim() || addChore.isPending}
              onClick={() => addChore.mutate()}
              className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
            >
              {addChore.isPending ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && chores.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && chores.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-white/30 text-sm">No hay tareas aún</p>
            <p className="text-white/20 text-xs mt-1">Toca el + para agregar una</p>
          </div>
        )}

        {pending.length > 0 && (
          <section>
            <SectionLabel>Pendientes</SectionLabel>
            <div className="space-y-2">
              {pending.map((chore) => (
                <ChoreItem
                  key={chore.id}
                  chore={chore}
                  completed={false}
                  assignedName={chore.assigned_to ? members[chore.assigned_to] : undefined}
                  onToggle={() => toggleComplete.mutate(chore)}
                  onAddToBoard={() => addToBoard.mutate(chore)}
                  onDelete={() => deleteChore.mutate(chore.id)}
                  toggling={toggleComplete.isPending && toggleComplete.variables?.id === chore.id}
                  pinning={addToBoard.isPending && addToBoard.variables?.id === chore.id}
                />
              ))}
            </div>
          </section>
        )}

        {done.length > 0 && (
          <section className={cn(pending.length > 0 && "mt-4")}>
            <SectionLabel>Completadas hoy</SectionLabel>
            <div className="space-y-2">
              {done.map((chore) => (
                <ChoreItem
                  key={chore.id}
                  chore={chore}
                  completed={true}
                  assignedName={chore.assigned_to ? members[chore.assigned_to] : undefined}
                  onToggle={() => toggleComplete.mutate(chore)}
                  onAddToBoard={() => addToBoard.mutate(chore)}
                  onDelete={() => deleteChore.mutate(chore.id)}
                  toggling={toggleComplete.isPending && toggleComplete.variables?.id === chore.id}
                  pinning={addToBoard.isPending && addToBoard.variables?.id === chore.id}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 px-0.5">
      {children}
    </p>
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

function ChoreItem({
  chore,
  completed,
  assignedName,
  onToggle,
  onAddToBoard,
  onDelete,
  toggling,
  pinning,
}: {
  chore: Chore;
  completed: boolean;
  assignedName: string | undefined;
  onToggle: () => void;
  onAddToBoard: () => void;
  onDelete: () => void;
  toggling: boolean;
  pinning: boolean;
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
                  {RECURRENCE_LABELS[chore.recurrence as ChoreRecurrence] ?? chore.recurrence}
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
            className="w-7 h-7 flex items-center justify-center text-white/20 active:text-amber-400 rounded-lg transition-colors disabled:opacity-40"
          >
            <Pin className="w-3.5 h-3.5" />
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
