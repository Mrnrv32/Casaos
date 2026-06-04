"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { BoardCard } from "@/types/supabase";

type AttentionItem = {
  due_at: string;
  kind: string;
  link: string;
  priority: number;
  subtitle: string;
  title: string;
};

export function BoardClient() {
  const { homeId, userId, homeName } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useRealtimeInvalidate({
    channel: "board_cards",
    filter: homeId,
    queryKey: ["board_cards", homeId],
    tables: ["board_cards"],
  });

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
      setContent("");
      setShowForm(false);
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

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    addCard.mutate(trimmed);
  };

  const toggleForm = () => {
    setShowForm((v) => !v);
    if (!showForm) setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const isEmpty =
    !cardsLoading && !attentionLoading && cards.length === 0 && attention.length === 0;

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Tablero</h1>
          <p className="text-sm text-white/40">{homeName}</p>
        </div>
        <button
          onClick={toggleForm}
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

      {/* Add card form */}
      {showForm && (
        <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe una nota para el hogar..."
            rows={3}
            className="w-full bg-transparent text-white text-sm placeholder:text-white/25 resize-none outline-none leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
          <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
            <button
              onClick={() => {
                setShowForm(false);
                setContent("");
              }}
              className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
            >
              Cancelar
            </button>
            <button
              disabled={!content.trim() || addCard.isPending}
              onClick={handleSubmit}
              className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
            >
              {addCard.isPending ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Attention items */}
        {attention.length > 0 && (
          <section>
            <SectionLabel>Atención</SectionLabel>
            <div className="space-y-2">
              {attention.map((item, i) => (
                <AttentionCard key={i} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Manual board cards */}
        {cards.length > 0 && (
          <section className={attention.length > 0 ? "mt-4" : ""}>
            {attention.length > 0 && <SectionLabel>Notas</SectionLabel>}
            <div className="space-y-2">
              {cards.map((card) => (
                <ManualCard
                  key={card.id}
                  card={card}
                  onDismiss={() => dismissCard.mutate(card.id)}
                  dismissing={dismissCard.isPending && dismissCard.variables === card.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-white/30 text-sm">El tablero está vacío</p>
            <p className="text-white/20 text-xs mt-1">
              Toca el + para agregar una nota
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {(cardsLoading || attentionLoading) && cards.length === 0 && attention.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-14 bg-white/[0.04] rounded-xl animate-pulse"
              />
            ))}
          </div>
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

function ManualCard({
  card,
  onDismiss,
  dismissing,
}: {
  card: BoardCard;
  onDismiss: () => void;
  dismissing: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 transition-opacity",
        dismissing && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-white/80 leading-relaxed">{card.content}</p>
        <button
          onClick={onDismiss}
          disabled={dismissing}
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/25 active:text-white/60 active:bg-white/[0.06] transition-colors mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {card.source && (
        <p className="mt-1.5 text-[10px] text-white/20 uppercase tracking-wide">
          {card.source}
        </p>
      )}
    </div>
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
