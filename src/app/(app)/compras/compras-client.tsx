"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Circle, CheckCircle2, Trash2, ShoppingCart, Pencil, Pin } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { PantryItem } from "@/types/supabase";

export const SHOPPING_CATEGORIES = [
  "Frutas y Verduras",
  "Lácteos",
  "Carnes",
  "Panadería",
  "Bebidas",
  "Limpieza",
  "Higiene",
  "Abarrotes",
  "Otros",
] as const;
export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

type EditingItem = { id: string; name: string; category: string };

export function ComprasClient() {
  const { homeId, userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ShoppingCategory | "">("");
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pantry", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry")
        .select("*")
        .eq("home_id", homeId)
        .is("deleted_at", null)
        .order("category", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as PantryItem[];
    },
  });

  useRealtimeInvalidate({
    channel: "pantry",
    filter: homeId,
    queryKey: ["pantry", homeId],
    tables: ["pantry"],
  });

  const pendingCount = items.filter((i) => !i.is_bought).length;
  const boughtCount = items.filter((i) => i.is_bought).length;

  const grouped = SHOPPING_CATEGORIES.reduce<Record<string, PantryItem[]>>((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, PantryItem[]>);

  const uncategorized = items.filter(
    (i) => !i.category || !(SHOPPING_CATEGORIES as readonly string[]).includes(i.category)
  );
  if (uncategorized.length > 0) {
    grouped["Otros"] = [...(grouped["Otros"] ?? []), ...uncategorized];
  }

  const toggleBought = useMutation({
    mutationFn: async (item: PantryItem) => {
      const { error } = await supabase
        .from("pantry")
        .update({ is_bought: !item.is_bought, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pantry", homeId] }),
    onError: () => toast.error("No se pudo actualizar"),
  });

  const updateItem = useMutation({
    mutationFn: async (editing: EditingItem) => {
      const { error } = await supabase
        .from("pantry")
        .update({
          item_name: editing.name.trim(),
          category: editing.category,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ["pantry", homeId] });
    },
    onError: () => toast.error("No se pudo actualizar"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pantry")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pantry", homeId] }),
    onError: () => toast.error("No se pudo eliminar"),
  });

  const pinToBoard = useMutation({
    mutationFn: async (item: PantryItem) => {
      const { error } = await supabase.from("board_cards").insert({
        content: item.item_name,
        home_id: homeId,
        created_by: userId,
        source: "pantry",
        source_id: item.id,
        source_url: "/compras",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Agregado al tablero"),
    onError: () => toast.error("No se pudo agregar al tablero"),
  });

  const clearBought = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pantry")
        .update({ deleted_at: new Date().toISOString() })
        .eq("home_id", homeId)
        .eq("is_bought", true)
        .is("deleted_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry", homeId] });
      toast.success("Lista limpiada");
    },
    onError: () => toast.error("No se pudo limpiar"),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pantry").insert({
        item_name: name.trim(),
        category: category || "Otros",
        home_id: homeId,
        added_by: userId,
        is_bought: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setCategory("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["pantry", homeId] });
    },
    onError: () => toast.error("No se pudo agregar"),
  });

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Compras</h1>
          <p className="text-sm text-white/40">
            {items.length === 0
              ? "Tu lista de compras"
              : pendingCount > 0
              ? `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`
              : "Todo comprado"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {boughtCount > 0 && (
            <button
              onClick={() => clearBought.mutate()}
              disabled={clearBought.isPending}
              className="text-[11px] text-white/40 px-2.5 py-1 rounded-full border border-white/[0.10] active:text-amber-400 active:border-amber-400/30 disabled:opacity-40 transition-colors"
            >
              Limpiar ({boughtCount})
            </button>
          )}
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
              className={cn(
                "w-5 h-5 transition-transform duration-200",
                showForm && "rotate-45"
              )}
            />
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 bg-[#1a1a1a] rounded-xl border border-white/[0.06] p-3 flex flex-col gap-3 flex-shrink-0">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) addItem.mutate();
            }}
            placeholder="¿Qué necesitas comprar?"
            className="w-full bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {SHOPPING_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(category === cat ? "" : cat)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  category === cat
                    ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                    : "bg-transparent border-white/[0.10] text-white/40"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
            <button
              onClick={() => {
                setShowForm(false);
                setName("");
                setCategory("");
              }}
              className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
            >
              Cancelar
            </button>
            <button
              disabled={!name.trim() || addItem.isPending}
              onClick={() => addItem.mutate()}
              className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
            >
              {addItem.isPending ? "Guardando…" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && items.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-11 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <ShoppingCart className="w-8 h-8 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">La lista está vacía</p>
            <p className="text-white/20 text-xs mt-1">Toca el + para agregar un artículo</p>
          </div>
        )}

        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <section key={cat}>
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2 px-0.5">
                {cat}
              </p>
              <div className="space-y-1.5">
                {catItems.map((item) => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    isEditing={editingItem?.id === item.id}
                    editName={editingItem?.id === item.id ? editingItem.name : ""}
                    editCategory={editingItem?.id === item.id ? editingItem.category : ""}
                    onToggle={() => toggleBought.mutate(item)}
                    onDelete={() => deleteItem.mutate(item.id)}
                    onPin={() => pinToBoard.mutate(item)}
                    onEdit={() =>
                      setEditingItem({
                        id: item.id,
                        name: item.item_name,
                        category: item.category ?? "Otros",
                      })
                    }
                    onEditNameChange={(n) =>
                      setEditingItem((prev) => (prev ? { ...prev, name: n } : null))
                    }
                    onEditCategoryChange={(c) =>
                      setEditingItem((prev) => (prev ? { ...prev, category: c } : null))
                    }
                    onSaveEdit={() => editingItem && updateItem.mutate(editingItem)}
                    onCancelEdit={() => setEditingItem(null)}
                    toggling={
                      toggleBought.isPending &&
                      (toggleBought.variables as PantryItem)?.id === item.id
                    }
                    pinning={
                      pinToBoard.isPending &&
                      (pinToBoard.variables as PantryItem)?.id === item.id
                    }
                    saving={updateItem.isPending && editingItem?.id === item.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShoppingItem({
  item,
  isEditing,
  editName,
  editCategory,
  onToggle,
  onDelete,
  onPin,
  onEdit,
  onEditNameChange,
  onEditCategoryChange,
  onSaveEdit,
  onCancelEdit,
  toggling,
  pinning,
  saving,
}: {
  item: PantryItem;
  isEditing: boolean;
  editName: string;
  editCategory: string;
  onToggle: () => void;
  onDelete: () => void;
  onPin: () => void;
  onEdit: () => void;
  onEditNameChange: (n: string) => void;
  onEditCategoryChange: (c: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  toggling: boolean;
  pinning: boolean;
  saving: boolean;
}) {
  if (isEditing) {
    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-amber-400/20 px-3 py-3 flex flex-col gap-3">
        <input
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && editName.trim()) onSaveEdit();
            if (e.key === "Escape") onCancelEdit();
          }}
          className="w-full bg-transparent text-white text-sm outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {SHOPPING_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onEditCategoryChange(cat)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                editCategory === cat
                  ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                  : "bg-transparent border-white/[0.10] text-white/40"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
          <button
            onClick={onCancelEdit}
            className="text-xs text-white/40 px-3 py-1.5 active:text-white/60"
          >
            Cancelar
          </button>
          <button
            disabled={!editName.trim() || saving}
            onClick={onSaveEdit}
            className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[#1a1a1a] rounded-xl border border-white/[0.06] px-3 py-2.5 flex items-center gap-2 transition-opacity",
        item.is_bought && "opacity-40"
      )}
    >
      <button
        onClick={onToggle}
        disabled={toggling}
        className="flex-shrink-0 active:scale-90 transition-transform"
      >
        {item.is_bought ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className="w-5 h-5 text-white/20" />
        )}
      </button>

      <p
        className={cn(
          "flex-1 text-sm text-white/80 min-w-0 truncate",
          item.is_bought && "line-through text-white/40"
        )}
      >
        {item.item_name}
      </p>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center text-white/20 active:text-amber-400 rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onPin}
          disabled={pinning}
          title="Agregar al tablero"
          className="w-7 h-7 flex items-center justify-center text-white/20 active:text-amber-400 rounded-lg transition-colors disabled:opacity-40"
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center text-white/20 active:text-red-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
