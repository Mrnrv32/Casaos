"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pin, ChevronLeft, ChevronRight,
  Shuffle, ExternalLink, MapPin, X, Trash2, Pencil, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarTag, CoupleMoment } from "@/types/supabase";

const TAG_LABELS: Record<CalendarTag, string> = {
  Medical: "Médico",
  Social: "Social",
  Bills: "Pagos",
  Maintenance: "Mantenimiento",
  Momento: "Momento",
};

const TAG_COLORS: Record<CalendarTag, string> = {
  Medical: "bg-sky-400/20 text-sky-400 border-sky-400/30",
  Social: "bg-violet-400/20 text-violet-400 border-violet-400/30",
  Bills: "bg-red-400/20 text-red-400 border-red-400/30",
  Maintenance: "bg-amber-400/20 text-amber-400 border-amber-400/30",
  Momento: "bg-rose-400/20 text-rose-400 border-rose-400/30",
};

const TAGS: CalendarTag[] = ["Medical", "Social", "Bills", "Maintenance", "Momento"];
const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];
const CATEGORY_SUGGESTIONS = ["Cita", "Viaje", "Experiencia", "En casa", "Cultura", "Gastro", "Aventura"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(start_at: string): string {
  return new Date(start_at).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function evLocalDateStr(ev: CalendarEvent): string {
  if (ev.is_all_day) return ev.start_at.slice(0, 10);
  const d = new Date(ev.start_at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarClient() {
  const { homeId, userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const todayStr = toLocalDateStr(today);

  // ── Event form state ──
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [showEventForm, setShowEventForm] = useState(false);
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState(todayStr);
  const [evTime, setEvTime] = useState("");
  const [evIsAllDay, setEvIsAllDay] = useState(true);
  const [evTag, setEvTag] = useState<CalendarTag | "">("");
  const [evLinkUrl, setEvLinkUrl] = useState("");

  // ── Momento state ──
  const [showMomentoForm, setShowMomentoForm] = useState(false);
  const [moTitle, setMoTitle] = useState("");
  const [moCategory, setMoCategory] = useState("");
  const [moExternalUrl, setMoExternalUrl] = useState("");
  const [moMapUrl, setMoMapUrl] = useState("");
  const [selectedMomento, setSelectedMomento] = useState<CoupleMoment | null>(null);
  const [lastShuffleId, setLastShuffleId] = useState<string | null>(null);

  // ── Event detail / edit state ──
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingMomento, setEditingMomento] = useState<CoupleMoment | null>(null);

  // ── Week computed ──
  const weekStart = useMemo(() => {
    const m = getMonday(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [today, weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = useMemo(() => {
    const s = weekDays[0];
    const e = weekDays[6];
    const sm = s.toLocaleDateString("es-MX", { month: "short" });
    const em = e.toLocaleDateString("es-MX", { month: "short" });
    return sm === em
      ? `${s.getDate()}–${e.getDate()} ${sm}`
      : `${s.getDate()} ${sm} – ${e.getDate()} ${em}`;
  }, [weekDays]);

  const selectedDayLabel = useMemo(() => {
    const d = new Date(`${selectedDay}T12:00:00`);
    return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  }, [selectedDay]);

  // ── Queries ──
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["calendar_events", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("home_id", homeId)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  const { data: momentos = [] } = useQuery({
    queryKey: ["couple_moments", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("couple_moments")
        .select("*")
        .eq("home_id", homeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CoupleMoment[];
    },
  });

  useRealtimeInvalidate({
    channel: "calendar_events",
    filter: homeId,
    queryKey: ["calendar_events", homeId],
    tables: ["calendar_events"],
  });

  useRealtimeInvalidate({
    channel: "couple_moments",
    filter: homeId,
    queryKey: ["couple_moments", homeId],
    tables: ["couple_moments"],
  });

  // ── Computed ──
  const daysWithEvents = useMemo(() => {
    const s = new Set<string>();
    for (const ev of events) s.add(evLocalDateStr(ev));
    return s;
  }, [events]);

  const dayEvents = useMemo(
    () => events.filter((ev) => evLocalDateStr(ev) === selectedDay),
    [events, selectedDay]
  );

  const pendingMomentos = useMemo(
    () => momentos.filter((m) => m.status !== "completed"),
    [momentos]
  );

  // ── Mutations ──
  const pinToBoard = useMutation({
    mutationFn: async (event: CalendarEvent) => {
      const { error } = await supabase.from("board_cards").insert({
        content: event.title,
        home_id: homeId,
        created_by: userId,
        source: "event",
        source_id: event.id,
        source_url: "/calendar",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Agregado al tablero"),
    onError: () => toast.error("No se pudo agregar al tablero"),
  });

  const pinMomentoToBoard = useMutation({
    mutationFn: async (momento: CoupleMoment) => {
      const { error } = await supabase.from("board_cards").insert({
        content: momento.title,
        home_id: homeId,
        created_by: userId,
        source: "moment",
        source_id: momento.id,
        source_url: "/calendar",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Agregado al tablero"),
    onError: () => toast.error("No se pudo agregar al tablero"),
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      const startAt = evIsAllDay
        ? `${evDate}T00:00:00`
        : new Date(`${evDate}T${evTime || "09:00"}:00`).toISOString();
      const { error } = await supabase.from("calendar_events").insert({
        title: evTitle.trim(),
        home_id: homeId,
        created_by: userId,
        start_at: startAt,
        is_all_day: evIsAllDay,
        tag: evTag || null,
        link_url: evLinkUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetEventForm();
      queryClient.invalidateQueries({ queryKey: ["calendar_events", homeId] });
    },
    onError: () => toast.error("No se pudo agregar el evento"),
  });

  const addMomento = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("couple_moments").insert({
        title: moTitle.trim(),
        category: moCategory.trim() || null,
        external_url: moExternalUrl.trim() || null,
        map_url: moMapUrl.trim() || null,
        home_id: homeId,
        created_by: userId,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetMomentoForm();
      queryClient.invalidateQueries({ queryKey: ["couple_moments", homeId] });
    },
    onError: () => toast.error("No se pudo agregar el momento"),
  });

  const deleteMomento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("couple_moments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedMomento(null);
      queryClient.invalidateQueries({ queryKey: ["couple_moments", homeId] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedEvent(null);
      queryClient.invalidateQueries({ queryKey: ["calendar_events", homeId] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const updateEvent = useMutation({
    mutationFn: async (id: string) => {
      const startAt = evIsAllDay ? `${evDate}T00:00:00` : new Date(`${evDate}T${evTime || "09:00"}:00`).toISOString();
      const { error } = await supabase.from("calendar_events").update({
        title: evTitle.trim(),
        start_at: startAt,
        is_all_day: evIsAllDay,
        tag: evTag || null,
        link_url: evLinkUrl.trim() || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      resetEventForm();
      queryClient.invalidateQueries({ queryKey: ["calendar_events", homeId] });
    },
    onError: () => toast.error("No se pudo actualizar"),
  });

  const updateMomento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("couple_moments").update({
        title: moTitle.trim(),
        category: moCategory.trim() || null,
        external_url: moExternalUrl.trim() || null,
        map_url: moMapUrl.trim() || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      resetMomentoForm();
      queryClient.invalidateQueries({ queryKey: ["couple_moments", homeId] });
    },
    onError: () => toast.error("No se pudo actualizar"),
  });

  // ── Helpers ──
  function handleShuffle() {
    if (!pendingMomentos.length) return;
    const pool = lastShuffleId
      ? pendingMomentos.filter((m) => m.id !== lastShuffleId)
      : pendingMomentos;
    const src = pool.length ? pool : pendingMomentos;
    const pick = src[Math.floor(Math.random() * src.length)];
    setLastShuffleId(pick.id);
    setSelectedMomento(pick);
  }

  function resetEventForm() {
    setEvTitle(""); setEvTime(""); setEvIsAllDay(true); setEvTag(""); setEvLinkUrl("");
    setShowEventForm(false);
    setEditingEvent(null);
  }

  function resetMomentoForm() {
    setMoTitle(""); setMoCategory(""); setMoExternalUrl(""); setMoMapUrl("");
    setShowMomentoForm(false);
    setEditingMomento(null);
  }

  function openEditEvent(ev: CalendarEvent) {
    setSelectedEvent(null);
    setEvTitle(ev.title);
    setEvDate(evLocalDateStr(ev));
    setEvIsAllDay(ev.is_all_day ?? true);
    const localTime = (() => {
      const d = new Date(ev.start_at);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    })();
    setEvTime(ev.is_all_day ? "" : localTime);
    setEvTag((ev.tag as CalendarTag) ?? "");
    setEvLinkUrl(ev.link_url ?? "");
    setEditingEvent(ev);
  }

  function openEditMomento(m: CoupleMoment) {
    setSelectedMomento(null);
    setMoTitle(m.title);
    setMoCategory(m.category ?? "");
    setMoExternalUrl(m.external_url ?? "");
    setMoMapUrl(m.map_url ?? "");
    setEditingMomento(m);
  }

  function exportToIcs(ev: CalendarEvent) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const nowUtc = (() => {
      const d = new Date();
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    })();

    let dtstart: string;
    if (ev.is_all_day) {
      const date = ev.start_at.slice(0, 10).replace(/-/g, "");
      dtstart = `DTSTART;VALUE=DATE:${date}`;
    } else {
      const d = new Date(ev.start_at);
      dtstart = `DTSTART:${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    }

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CasaOS//CasaOS//ES",
      "BEGIN:VEVENT",
      `UID:${ev.id}@casaos`,
      `DTSTAMP:${nowUtc}`,
      dtstart,
      `SUMMARY:${ev.title}`,
      ev.description ? `DESCRIPTION:${ev.description}` : null,
      ev.link_url ? `URL:${ev.link_url}` : null,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    const blob = new Blob([lines], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ══════════ TOP — Events ══════════ */}
      <div className="px-4 pt-6 flex-shrink-0">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Calendario</h1>
            <p className="text-sm text-white/40">{weekLabel}</p>
          </div>
          <button
            onClick={() => {
              if (!showEventForm) setEvDate(selectedDay);
              setShowEventForm((v) => !v);
            }}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
              showEventForm
                ? "bg-amber-400/20 text-amber-400"
                : "bg-white/[0.06] text-white/60 active:bg-white/[0.10]"
            )}
          >
            <Plus className={cn("w-5 h-5 transition-transform duration-200", showEventForm && "rotate-45")} />
          </button>
        </div>

        {/* Event add / edit form */}
        {(showEventForm || editingEvent) && (
          <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-3">
            <input
              autoFocus
              type="text"
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="Nombre del evento…"
              className="w-full bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
            />
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none [color-scheme:dark]"
              />
              <button
                onClick={() => setEvIsAllDay((v) => !v)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors shrink-0",
                  evIsAllDay
                    ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                    : "bg-transparent border-white/[0.10] text-white/40"
                )}
              >
                Todo el día
              </button>
            </div>
            {!evIsAllDay && (
              <input
                type="time"
                value={evTime}
                onChange={(e) => setEvTime(e.target.value)}
                className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-white text-sm outline-none [color-scheme:dark]"
              />
            )}
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setEvTag(evTag === tag ? "" : tag)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    evTag === tag ? TAG_COLORS[tag] : "bg-transparent border-white/[0.10] text-white/40"
                  )}
                >
                  {TAG_LABELS[tag]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
              <ExternalLink className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <input
                type="url"
                value={evLinkUrl}
                onChange={(e) => setEvLinkUrl(e.target.value)}
                placeholder="Link (Meet, reservación, web…)"
                className="flex-1 bg-transparent text-white/70 text-xs placeholder:text-white/20 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
              <button onClick={resetEventForm} className="text-xs text-white/40 px-3 py-1.5 active:text-white/60">
                Cancelar
              </button>
              <button
                disabled={!evTitle.trim() || !evDate || addEvent.isPending || updateEvent.isPending}
                onClick={() => editingEvent ? updateEvent.mutate(editingEvent.id) : addEvent.mutate()}
                className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
              >
                {(addEvent.isPending || updateEvent.isPending) ? "Guardando…" : editingEvent ? "Guardar" : "Agregar"}
              </button>
            </div>
          </div>
        )}

        {/* Week strip */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="w-8 h-8 flex items-center justify-center text-white/30 active:text-white/70 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-white/30 capitalize">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="w-8 h-8 flex items-center justify-center text-white/30 active:text-white/70 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => {
              const dayStr = toLocalDateStr(day);
              const isToday = dayStr === todayStr;
              const isSelected = dayStr === selectedDay;
              const hasEvents = daysWithEvents.has(dayStr);
              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDay(dayStr)}
                  className={cn(
                    "flex flex-col items-center pt-2 pb-1.5 rounded-xl transition-colors",
                    isSelected ? "bg-amber-400" : isToday ? "bg-white/[0.08]" : "active:bg-white/[0.05]"
                  )}
                >
                  <span className={cn("text-[10px] uppercase tracking-wide", isSelected ? "text-black/50" : "text-white/30")}>
                    {DAY_LETTERS[i]}
                  </span>
                  <span className={cn("text-sm font-semibold mt-0.5", isSelected ? "text-black" : isToday ? "text-white" : "text-white/55")}>
                    {day.getDate()}
                  </span>
                  <span className={cn(
                    "w-1 h-1 rounded-full mt-1",
                    hasEvents
                      ? isSelected ? "bg-black/30" : isToday ? "bg-amber-400" : "bg-white/25"
                      : "opacity-0"
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Day label */}
        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1.5 capitalize">
          {selectedDayLabel}
        </p>

        {/* Compact event list */}
        <div className="max-h-[130px] overflow-y-auto">
          {eventsLoading && (
            <div className="space-y-1.5">
              {[1, 2].map((n) => (
                <div key={n} className="h-7 bg-white/[0.04] rounded-lg animate-pulse" />
              ))}
            </div>
          )}
          {!eventsLoading && dayEvents.length === 0 && (
            <p className="text-white/20 text-xs py-1.5">Sin eventos · toca + para agregar</p>
          )}
          {dayEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0"
            >
              <button
                onClick={() => setSelectedEvent(ev)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left active:opacity-70 transition-opacity"
              >
                <span className="text-[11px] text-white/30 w-10 shrink-0 tabular-nums">
                  {ev.is_all_day ? "·" : formatTime(ev.start_at)}
                </span>
                <span className="flex-1 text-sm text-white/70 truncate">{ev.title}</span>
                {ev.tag && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md border shrink-0", TAG_COLORS[ev.tag as CalendarTag])}>
                    {TAG_LABELS[ev.tag as CalendarTag]}
                  </span>
                )}
              </button>
              <button
                onClick={() => deleteEvent.mutate(ev.id)}
                disabled={deleteEvent.isPending && deleteEvent.variables === ev.id}
                className="w-6 h-6 flex items-center justify-center text-white/15 active:text-red-400 shrink-0 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-white/[0.06] mt-3" />

      {/* ══════════ BOTTOM — Momentos ══════════ */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-4">

        {/* Section header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white/70">Momentos</h2>
            {pendingMomentos.length > 0 && (
              <span className="text-[10px] text-white/25">{pendingMomentos.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShuffle}
              disabled={pendingMomentos.length === 0}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                pendingMomentos.length === 0
                  ? "text-white/10"
                  : "text-white/35 active:text-amber-400 active:bg-amber-400/10"
              )}
              title="Sugerir un momento"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowMomentoForm((v) => !v)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                showMomentoForm
                  ? "bg-amber-400/20 text-amber-400"
                  : "bg-white/[0.06] text-white/60 active:bg-white/[0.10]"
              )}
            >
              <Plus className={cn("w-4 h-4 transition-transform duration-200", showMomentoForm && "rotate-45")} />
            </button>
          </div>
        </div>

        {/* Add / edit momento form */}
        {(showMomentoForm || editingMomento) && (
          <div className="mb-3 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-3 flex-shrink-0">
            <input
              autoFocus
              type="text"
              value={moTitle}
              onChange={(e) => setMoTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && moTitle.trim()) addMomento.mutate(); }}
              placeholder="¿Qué quieren hacer?"
              className="w-full bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_SUGGESTIONS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMoCategory(moCategory === cat ? "" : cat)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    moCategory === cat
                      ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                      : "bg-transparent border-white/[0.10] text-white/40"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-2.5">
              <ExternalLink className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <input
                type="url"
                value={moExternalUrl}
                onChange={(e) => setMoExternalUrl(e.target.value)}
                placeholder="Link (TikTok, Instagram, web…)"
                className="flex-1 bg-transparent text-white/70 text-xs placeholder:text-white/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 -mt-1">
              <MapPin className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <input
                type="url"
                value={moMapUrl}
                onChange={(e) => setMoMapUrl(e.target.value)}
                placeholder="Google Maps…"
                className="flex-1 bg-transparent text-white/70 text-xs placeholder:text-white/20 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
              <button onClick={resetMomentoForm} className="text-xs text-white/40 px-3 py-1.5 active:text-white/60">
                Cancelar
              </button>
              <button
                disabled={!moTitle.trim() || addMomento.isPending || updateMomento.isPending}
                onClick={() => editingMomento ? updateMomento.mutate(editingMomento.id) : addMomento.mutate()}
                className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
              >
                {(addMomento.isPending || updateMomento.isPending) ? "Guardando…" : editingMomento ? "Guardar" : "Agregar"}
              </button>
            </div>
          </div>
        )}

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {momentos.length === 0 && !showMomentoForm && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-4">
              <p className="text-white/25 text-sm">Sin momentos aún</p>
              <p className="text-white/15 text-xs mt-1">Toca + para agregar el primero</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {momentos.map((m) => (
              <MomentoCard key={m.id} momento={m} onTap={() => setSelectedMomento(m)} />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ OVERLAY — Momento detail ══════════ */}
      {selectedMomento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedMomento(null)} />
          <div className="relative bg-[#1c1c1c] rounded-2xl w-full max-w-[360px] p-5 flex flex-col gap-4 shadow-2xl border border-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white leading-snug">
                  {selectedMomento.title}
                </h3>
                {selectedMomento.category && (
                  <p className="text-[11px] text-white/35 uppercase tracking-wide mt-1">
                    {selectedMomento.category}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedMomento(null)}
                className="w-7 h-7 flex items-center justify-center text-white/25 active:text-white/60 rounded-lg shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedMomento.description && (
              <p className="text-sm text-white/50 leading-relaxed">
                {selectedMomento.description}
              </p>
            )}

            {(selectedMomento.external_url || selectedMomento.map_url) && (
              <div className="flex gap-2">
                {selectedMomento.external_url && (
                  <a
                    href={selectedMomento.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] rounded-xl py-3 text-sm text-white/65 active:bg-white/[0.10] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver link
                  </a>
                )}
                {selectedMomento.map_url && (
                  <a
                    href={selectedMomento.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-sky-400/10 border border-sky-400/20 rounded-xl py-3 text-sm text-sky-400/80 active:bg-sky-400/20 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Ver en mapa
                  </a>
                )}
              </div>
            )}

            <button
              onClick={() => { pinMomentoToBoard.mutate(selectedMomento); setSelectedMomento(null); }}
              disabled={pinMomentoToBoard.isPending}
              className="flex items-center justify-center gap-2 bg-white/[0.06] rounded-xl py-3 text-sm text-white/60 active:bg-white/[0.10] transition-colors disabled:opacity-40"
            >
              <Pin className="w-4 h-4" />
              Agregar al tablero
            </button>

            <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
              <button
                onClick={() => openEditMomento(selectedMomento)}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-white/40 active:text-white/70 py-2 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={() => deleteMomento.mutate(selectedMomento.id)}
                disabled={deleteMomento.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-red-400/50 active:text-red-400 py-2 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ OVERLAY — Event detail ══════════ */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-[#1c1c1c] rounded-2xl w-full max-w-[360px] p-5 flex flex-col gap-4 shadow-2xl border border-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white leading-snug">
                  {selectedEvent.title}
                </h3>
                <p className="text-[12px] text-white/35 mt-1">
                  {new Date(`${selectedEvent.start_at.slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                  {!selectedEvent.is_all_day && ` · ${formatTime(selectedEvent.start_at)}`}
                  {selectedEvent.is_all_day && " · Todo el día"}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-7 h-7 flex items-center justify-center text-white/25 active:text-white/60 rounded-lg shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedEvent.tag && (
              <span className={cn("self-start text-[11px] px-2.5 py-1 rounded-full border", TAG_COLORS[selectedEvent.tag as CalendarTag])}>
                {TAG_LABELS[selectedEvent.tag as CalendarTag]}
              </span>
            )}

            {selectedEvent.description && (
              <p className="text-sm text-white/50 leading-relaxed">
                {selectedEvent.description}
              </p>
            )}

            {selectedEvent.link_url && (
              <a
                href={selectedEvent.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white/[0.06] rounded-xl py-3 text-sm text-white/65 active:bg-white/[0.10] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir link
              </a>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { pinToBoard.mutate(selectedEvent); setSelectedEvent(null); }}
                disabled={pinToBoard.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] rounded-xl py-3 text-sm text-white/60 active:bg-white/[0.10] transition-colors disabled:opacity-40"
              >
                <Pin className="w-4 h-4" />
                Al tablero
              </button>
              <button
                onClick={() => exportToIcs(selectedEvent)}
                className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] rounded-xl py-3 text-sm text-white/60 active:bg-white/[0.10] transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Exportar
              </button>
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
              <button
                onClick={() => openEditEvent(selectedEvent)}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-white/40 active:text-white/70 py-2 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
              <div className="w-px bg-white/[0.06]" />
              <button
                onClick={() => deleteEvent.mutate(selectedEvent.id)}
                disabled={deleteEvent.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-red-400/50 active:text-red-400 py-2 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MomentoCard({
  momento,
  onTap,
}: {
  momento: CoupleMoment;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 text-left flex flex-col gap-2 min-h-[96px] active:bg-white/[0.08] transition-colors"
    >
      <p className="text-sm text-white/80 line-clamp-2 leading-snug flex-1">{momento.title}</p>
      {momento.category && (
        <p className="text-[10px] text-white/30 uppercase tracking-wide truncate">{momento.category}</p>
      )}
      {(momento.external_url || momento.map_url) && (
        <div className="flex gap-1.5 flex-wrap">
          {momento.external_url && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-400/60 bg-amber-400/10 rounded px-1.5 py-0.5">
              <ExternalLink className="w-2.5 h-2.5" />
              Link
            </span>
          )}
          {momento.map_url && (
            <span className="flex items-center gap-0.5 text-[10px] text-sky-400/60 bg-sky-400/10 rounded px-1.5 py-0.5">
              <MapPin className="w-2.5 h-2.5" />
              Mapa
            </span>
          )}
        </div>
      )}
    </button>
  );
}
