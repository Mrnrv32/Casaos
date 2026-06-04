"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Pin, Trash2, FolderKanban, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { Project, ProjectMilestone, SavingsGoal } from "@/types/supabase";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ["planning", "in_progress", "done"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  planning:    "Planeando",
  in_progress: "En progreso",
  done:        "Terminado",
};

const STATUS_BADGE: Record<Status, string> = {
  planning:    "text-amber-400 bg-amber-400/10 border-amber-400/20",
  in_progress: "text-blue-400  bg-blue-400/10  border-blue-400/20",
  done:        "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const SECTION_ORDER: Status[] = ["in_progress", "planning", "done"];
const SECTION_TITLE: Record<Status, string> = {
  in_progress: "En progreso",
  planning:    "Planeando",
  done:        "Terminados",
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

// ── Main client ──────────────────────────────────────────────────────────────

export function ProjectsClient() {
  const { homeId, userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd]     = useState(false);
  const [selected, setSelected]   = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("home_id", homeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("home_id", homeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ProjectMilestone[];
    },
  });

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ["savings_goals", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("home_id", homeId);
      if (error) throw error;
      return data as SavingsGoal[];
    },
  });

  useRealtimeInvalidate({
    channel: "projects",
    filter: homeId,
    queryKey: ["projects", homeId],
    tables: ["projects"],
  });

  useRealtimeInvalidate({
    channel: "milestones",
    filter: homeId,
    queryKey: ["milestones", homeId],
    tables: ["project_milestones"],
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["projects", homeId] });
      toast.success("Proyecto eliminado");
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const pinToBoard = useMutation({
    mutationFn: async (project: Project) => {
      const { error } = await supabase.from("board_cards").insert({
        content: `Proyecto: ${project.title}`,
        home_id: homeId,
        created_by: userId,
        source: "project",
        source_id: project.id,
        source_url: "/projects",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Agregado al tablero"),
    onError:   () => toast.error("No se pudo agregar al tablero"),
  });

  const grouped = SECTION_ORDER.reduce<Record<Status, Project[]>>(
    (acc, s) => {
      acc[s] = projects.filter((p) => (p.status ?? "planning") === s);
      return acc;
    },
    { in_progress: [], planning: [], done: [] }
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Proyectos</h1>
          <p className="text-sm text-white/40">
            {projects.length > 0
              ? `${projects.length} proyecto${projects.length !== 1 ? "s" : ""}`
              : "Tu lista de proyectos"}
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
            showAdd
              ? "bg-amber-400/20 text-amber-400"
              : "bg-white/[0.06] text-white/60 active:bg-white/[0.10]"
          )}
        >
          <Plus className={cn("w-5 h-5 transition-transform duration-200", showAdd && "rotate-45")} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading && projects.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <FolderKanban className="w-8 h-8 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No hay proyectos aún</p>
            <p className="text-white/20 text-xs mt-1">Toca el + para crear el primero</p>
          </div>
        )}

        {!isLoading && projects.length > 0 && (
          <div className="space-y-5">
            {SECTION_ORDER.map((status) => {
              const group = grouped[status];
              if (group.length === 0) return null;
              return (
                <div key={status}>
                  <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
                    {SECTION_TITLE[status]}
                  </p>
                  <div className="space-y-2">
                    {group.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        milestones={milestones.filter((m) => m.project_id === project.id)}
                        onClick={() => setSelected(project)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddProjectSheet
          homeId={homeId}
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            queryClient.invalidateQueries({ queryKey: ["projects", homeId] });
          }}
        />
      )}

      {selected && (
        <ProjectDetailCard
          project={selected}
          milestones={milestones.filter((m) => m.project_id === selected.id)}
          savingsGoal={savingsGoals.find((g) => g.project_id === selected.id) ?? null}
          homeId={homeId}
          onClose={() => setSelected(null)}
          onDelete={() => deleteProject.mutate(selected.id)}
          onPin={() => pinToBoard.mutate(selected)}
          deleting={deleteProject.isPending}
          pinning={pinToBoard.isPending}
          onMilestoneChange={() => queryClient.invalidateQueries({ queryKey: ["milestones", homeId] })}
        />
      )}
    </div>
  );
}

// ── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  milestones,
  onClick,
}: {
  project: Project;
  milestones: ProjectMilestone[];
  onClick: () => void;
}) {
  const status   = (project.status ?? "planning") as Status;
  const done     = milestones.filter((m) => m.is_done).length;
  const total    = milestones.length;
  const hasBudget = project.total_budget != null && project.total_budget > 0;
  const spent    = milestones.reduce((s, m) => s + (m.cost ?? 0), 0);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1a1a1a] rounded-xl border border-white/[0.06] px-3 py-2.5 active:opacity-70 transition-opacity"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 font-medium truncate">{project.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {total > 0 && (
              <p className="text-xs text-white/30">
                {done}/{total} hito{total !== 1 ? "s" : ""}
              </p>
            )}
            {hasBudget && (
              <p className="text-xs text-white/30">
                {fmtCurrency(spent)} / {fmtCurrency(project.total_budget!)}
              </p>
            )}
            {total === 0 && !hasBudget && (
              <p className="text-xs text-white/20">Sin hitos</p>
            )}
          </div>
          {hasBudget && spent > 0 && (
            <div className="mt-1.5 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  spent >= project.total_budget! ? "bg-red-400" : "bg-amber-400/60"
                )}
                style={{ width: `${Math.min(100, (spent / project.total_budget!) * 100)}%` }}
              />
            </div>
          )}
        </div>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5",
            STATUS_BADGE[status]
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
    </button>
  );
}

// ── Add Project Sheet ────────────────────────────────────────────────────────

function AddProjectSheet({
  homeId,
  userId,
  onClose,
  onSaved,
}: {
  homeId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle]           = useState("");
  const [status, setStatus]         = useState<Status>("planning");
  const [description, setDescription] = useState("");
  const [budgetText, setBudgetText] = useState("");

  const addProject = useMutation({
    mutationFn: async () => {
      const budget = budgetText.trim() ? parseFloat(budgetText.replace(/[^0-9.]/g, "")) : null;
      const { error } = await supabase.from("projects").insert({
        title: title.trim(),
        status,
        description: description.trim() || null,
        total_budget: budget && !isNaN(budget) ? budget : null,
        home_id: homeId,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError:   () => toast.error("No se pudo guardar el proyecto"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-[440px] bg-[#1a1a1a] rounded-t-2xl border-t border-white/[0.08] p-4 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Nuevo proyecto</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-white/30 active:text-white/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          autoFocus
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre del proyecto…"
          className="w-full bg-[#0f0f0f] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border border-white/[0.06] focus:border-white/[0.14] transition-colors"
        />

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Estado</p>
          <div className="flex gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  status === s
                    ? STATUS_BADGE[s]
                    : "bg-transparent border-white/[0.10] text-white/40"
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
            Descripción (opcional)
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notas, objetivos, contexto…"
            rows={3}
            className="w-full bg-[#0f0f0f] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border border-white/[0.06] focus:border-white/[0.14] resize-none leading-relaxed transition-colors"
          />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
            Presupuesto total (opcional)
          </p>
          <input
            type="number"
            inputMode="decimal"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            placeholder="0"
            className="w-full bg-[#0f0f0f] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border border-white/[0.06] focus:border-white/[0.14] transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
          >
            Cancelar
          </button>
          <button
            disabled={!title.trim() || addProject.isPending}
            onClick={() => addProject.mutate()}
            className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
          >
            {addProject.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Detail Card ──────────────────────────────────────────────────────

function ProjectDetailCard({
  project,
  milestones,
  savingsGoal,
  homeId,
  onClose,
  onDelete,
  onPin,
  deleting,
  pinning,
  onMilestoneChange,
}: {
  project: Project;
  milestones: ProjectMilestone[];
  savingsGoal: SavingsGoal | null;
  homeId: string;
  onClose: () => void;
  onDelete: () => void;
  onPin: () => void;
  deleting: boolean;
  pinning: boolean;
  onMilestoneChange: () => void;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle]   = useState("");
  const [newCost, setNewCost]     = useState("");
  const [adding, setAdding]       = useState(false);

  const status   = (project.status ?? "planning") as Status;
  const hasBudget = project.total_budget != null && project.total_budget > 0;
  const spent    = milestones.reduce((s, m) => s + (m.cost ?? 0), 0);
  const donePct  = milestones.length > 0
    ? Math.round((milestones.filter((m) => m.is_done).length / milestones.length) * 100)
    : 0;

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from("project_milestones")
        .update({ is_done })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: onMilestoneChange,
    onError: () => toast.error("No se pudo actualizar"),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: onMilestoneChange,
    onError: () => toast.error("No se pudo eliminar"),
  });

  const addMilestone = useMutation({
    mutationFn: async () => {
      const cost = newCost.trim() ? parseFloat(newCost.replace(/[^0-9.]/g, "")) : null;
      const { error } = await supabase.from("project_milestones").insert({
        title: newTitle.trim(),
        cost: cost && !isNaN(cost) ? cost : null,
        project_id: project.id,
        home_id: homeId,
        is_done: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      setNewCost("");
      setAdding(false);
      onMilestoneChange();
    },
    onError: () => toast.error("No se pudo agregar el hito"),
  });

  const savingsPct = savingsGoal
    ? Math.min(100, Math.round(((savingsGoal.current_amount ?? 0) / savingsGoal.target_amount) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-[#1c1c1c] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col max-h-[84vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">{project.title}</h2>
              <span
                className={cn(
                  "inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border",
                  STATUS_BADGE[status]
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-white/30 active:text-white/60 flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Budget bar */}
          {hasBudget && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-white/30">
                  Gastado: {fmtCurrency(spent)}
                </p>
                <p className="text-[10px] text-white/30">
                  Presupuesto: {fmtCurrency(project.total_budget!)}
                </p>
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    spent >= project.total_budget! ? "bg-red-400" : "bg-amber-400/70"
                  )}
                  style={{ width: `${Math.min(100, (spent / project.total_budget!) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Description */}
          {project.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5">Descripción</p>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-white/25">
                Hitos {milestones.length > 0 && `· ${milestones.filter((m) => m.is_done).length}/${milestones.length}`}
              </p>
              {milestones.length > 0 && (
                <p className="text-[10px] text-white/20">{donePct}%</p>
              )}
            </div>

            {milestones.length === 0 && !adding && (
              <p className="text-xs text-white/20 py-2">Sin hitos todavía</p>
            )}

            <div className="space-y-1">
              {milestones.map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  onToggle={(v) => toggleMilestone.mutate({ id: m.id, is_done: v })}
                  onDelete={() => deleteMilestone.mutate(m.id)}
                />
              ))}
            </div>

            {/* Inline add row */}
            {adding ? (
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTitle.trim()) addMilestone.mutate();
                    if (e.key === "Escape") { setAdding(false); setNewTitle(""); setNewCost(""); }
                  }}
                  placeholder="Nombre del hito…"
                  className="flex-1 bg-[#0f0f0f] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 outline-none border border-white/[0.08] focus:border-white/[0.16] transition-colors"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="$"
                  className="w-16 bg-[#0f0f0f] rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/20 outline-none border border-white/[0.08] focus:border-white/[0.16] transition-colors"
                />
                <button
                  disabled={!newTitle.trim() || addMilestone.isPending}
                  onClick={() => addMilestone.mutate()}
                  className="w-7 h-7 flex items-center justify-center bg-amber-400/20 text-amber-400 rounded-lg disabled:opacity-40 active:bg-amber-400/30"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setAdding(false); setNewTitle(""); setNewCost(""); }}
                  className="w-7 h-7 flex items-center justify-center text-white/25 active:text-white/50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="mt-2 flex items-center gap-1 text-xs text-white/25 active:text-white/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar hito
              </button>
            )}
          </div>

          {/* Savings goal */}
          {savingsGoal && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Meta de ahorro</p>
              <div className="bg-[#161616] rounded-xl border border-white/[0.06] px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-white/80 font-medium truncate">{savingsGoal.title}</p>
                  <p className="text-xs text-white/40 flex-shrink-0 ml-2">
                    {savingsPct}%
                  </p>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      savingsPct >= 100 ? "bg-emerald-400" : "bg-amber-400/60"
                    )}
                    style={{ width: `${savingsPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/25 mt-1">
                  {fmtCurrency(savingsGoal.current_amount ?? 0)} / {fmtCurrency(savingsGoal.target_amount)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-3 flex items-center justify-between border-t border-white/[0.06] flex-shrink-0">
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-red-400/60 active:text-red-400 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
          <button
            onClick={onPin}
            disabled={pinning}
            className="flex items-center gap-1.5 text-xs bg-white/[0.07] border border-white/[0.10] text-white/60 px-3 py-1.5 rounded-lg active:bg-amber-400/15 active:text-amber-400 active:border-amber-400/30 disabled:opacity-40 transition-colors"
          >
            <Pin className="w-3.5 h-3.5" />
            {pinning ? "Agregando…" : "Ver en tablero"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Milestone Row ────────────────────────────────────────────────────────────

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: ProjectMilestone;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
}) {
  const done = milestone.is_done ?? false;

  return (
    <div className="flex items-center gap-2 py-0.5 group">
      <button
        onClick={() => onToggle(!done)}
        className={cn(
          "w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors",
          done
            ? "border-emerald-400/40 bg-emerald-400/20"
            : "border-white/[0.18] active:border-white/30"
        )}
      >
        {done && <span className="block w-2 h-2 rounded-sm bg-emerald-400" />}
      </button>
      <span
        className={cn(
          "flex-1 text-sm transition-colors",
          done ? "line-through text-white/25" : "text-white/70"
        )}
      >
        {milestone.title}
      </span>
      {milestone.cost != null && milestone.cost > 0 && (
        <span className="text-[10px] text-white/25 flex-shrink-0">
          {fmtCurrency(milestone.cost)}
        </span>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-white/20 active:text-red-400 transition-all flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
