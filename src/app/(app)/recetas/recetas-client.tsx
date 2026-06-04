"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Pin, Trash2, ChefHat, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/supabase";
import type { Json } from "@/types/supabase";

const CATEGORIES = ["Desayuno", "Comida", "Cena", "Snack", "Otro"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_BADGE: Record<Category, string> = {
  Desayuno: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Comida:   "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Cena:     "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Snack:    "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Otro:     "text-white/40 bg-white/[0.06] border-white/[0.08]",
};

function parseIngredients(raw: Json | null): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((i): i is string => typeof i === "string");
}

export function RecetasClient() {
  const { homeId, userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"Todas" | Category>("Todas");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes", homeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("home_id", homeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recipe[];
    },
  });

  useRealtimeInvalidate({
    channel: "recipes",
    filter: homeId,
    queryKey: ["recipes", homeId],
    tables: ["recipes"],
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["recipes", homeId] });
      toast.success("Receta eliminada");
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const pinToBoard = useMutation({
    mutationFn: async (recipe: Recipe) => {
      const { error } = await supabase.from("board_cards").insert({
        content: `Hoy: ${recipe.title}`,
        home_id: homeId,
        created_by: userId,
        source: "recipe",
        source_id: recipe.id,
        source_url: "/recetas",
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Agregado al tablero"),
    onError: () => toast.error("No se pudo agregar al tablero"),
  });

  const tabs: Array<"Todas" | Category> = ["Todas", ...CATEGORIES];
  const filtered =
    activeTab === "Todas"
      ? recipes
      : recipes.filter((r) => r.category === activeTab);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Recetas</h1>
          <p className="text-sm text-white/40">
            {recipes.length > 0
              ? `${recipes.length} receta${recipes.length !== 1 ? "s" : ""}`
              : "Tu recetario"}
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
          <Plus
            className={cn(
              "w-5 h-5 transition-transform duration-200",
              showAdd && "rotate-45"
            )}
          />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-colors flex-shrink-0",
              activeTab === tab
                ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                : "bg-transparent border-white/[0.10] text-white/40"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading && recipes.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && recipes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <BookOpen className="w-8 h-8 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No hay recetas aún</p>
            <p className="text-white/20 text-xs mt-1">Toca el + para agregar la primera</p>
          </div>
        )}

        {!isLoading && recipes.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-white/30 text-sm">Sin recetas en esta categoría</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelected(recipe)}
            />
          ))}
        </div>
      </div>

      {showAdd && (
        <AddRecipeSheet
          homeId={homeId}
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            queryClient.invalidateQueries({ queryKey: ["recipes", homeId] });
          }}
        />
      )}

      {selected && (
        <RecipeDetailSheet
          recipe={selected}
          onClose={() => setSelected(null)}
          onDelete={() => deleteRecipe.mutate(selected.id)}
          onPin={() => pinToBoard.mutate(selected)}
          deleting={deleteRecipe.isPending}
          pinning={pinToBoard.isPending}
        />
      )}
    </div>
  );
}

// ── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const ingredients = parseIngredients(recipe.ingredients);
  const cat = recipe.category as Category | null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1a1a1a] rounded-xl border border-white/[0.06] px-3 py-2.5 active:opacity-70 transition-opacity"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 truncate font-medium">{recipe.title}</p>
          <p className="text-xs text-white/30 mt-0.5">
            {ingredients.length > 0
              ? `${ingredients.length} ingrediente${ingredients.length !== 1 ? "s" : ""}`
              : "Sin ingredientes"}
          </p>
        </div>
        {cat && CATEGORY_BADGE[cat] && (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0",
              CATEGORY_BADGE[cat]
            )}
          >
            {cat}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Add Recipe Sheet ─────────────────────────────────────────────────────────

function AddRecipeSheet({
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
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [description, setDescription] = useState("");

  const addRecipe = useMutation({
    mutationFn: async () => {
      const ingredients = ingredientsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase.from("recipes").insert({
        title: title.trim(),
        category: category || null,
        ingredients: ingredients.length > 0 ? ingredients : null,
        description: description.trim() || null,
        home_id: homeId,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError: () => toast.error("No se pudo guardar la receta"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-[440px] bg-[#1a1a1a] rounded-t-2xl border-t border-white/[0.08] p-4 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Nueva receta</h2>
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
          placeholder="Nombre de la receta…"
          className="w-full bg-[#0f0f0f] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border border-white/[0.06] focus:border-white/[0.14] transition-colors"
        />

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Categoría</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
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
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
            Ingredientes — uno por línea
          </p>
          <textarea
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder={"2 tazas de harina\n1 huevo\n½ taza de leche…"}
            rows={5}
            className="w-full bg-[#0f0f0f] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.06] focus:border-white/[0.14] resize-none leading-relaxed transition-colors"
          />
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
            Descripción / Instrucciones (opcional)
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pasos, notas, tips…"
            rows={3}
            className="w-full bg-[#0f0f0f] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none border border-white/[0.06] focus:border-white/[0.14] resize-none leading-relaxed transition-colors"
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
            disabled={!title.trim() || addRecipe.isPending}
            onClick={() => addRecipe.mutate()}
            className="text-xs bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg disabled:opacity-40 active:opacity-80"
          >
            {addRecipe.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recipe Detail Sheet ──────────────────────────────────────────────────────

function RecipeDetailSheet({
  recipe,
  onClose,
  onDelete,
  onPin,
  deleting,
  pinning,
}: {
  recipe: Recipe;
  onClose: () => void;
  onDelete: () => void;
  onPin: () => void;
  deleting: boolean;
  pinning: boolean;
}) {
  const ingredients = parseIngredients(recipe.ingredients);
  const [cookMode, setCookMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const cat = recipe.category as Category | null;

  const toggleCheck = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] bg-[#1c1c1c] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">{recipe.title}</h2>
              {cat && CATEGORY_BADGE[cat] && (
                <span
                  className={cn(
                    "inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full border",
                    CATEGORY_BADGE[cat]
                  )}
                >
                  {cat}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-white/30 active:text-white/60 flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {ingredients.length > 0 && (
            <button
              onClick={() => {
                setCookMode((v) => !v);
                setChecked(new Set());
              }}
              className={cn(
                "mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors",
                cookMode
                  ? "bg-emerald-400/15 border-emerald-400/30 text-emerald-400"
                  : "bg-white/[0.05] border-white/[0.10] text-white/40"
              )}
            >
              <ChefHat className="w-3.5 h-3.5" />
              {cookMode ? "Cocinando…" : "Modo cocina"}
            </button>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {ingredients.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
                Ingredientes
              </p>
              <div className="space-y-1.5">
                {ingredients.map((ing, i) => (
                  <button
                    key={i}
                    onClick={() => cookMode && toggleCheck(i)}
                    disabled={!cookMode}
                    className={cn(
                      "w-full text-left flex items-center gap-2.5 py-0.5 transition-opacity",
                      cookMode && "active:opacity-60",
                      checked.has(i) && "opacity-40"
                    )}
                  >
                    {cookMode ? (
                      <span
                        className={cn(
                          "w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors",
                          checked.has(i)
                            ? "border-emerald-400/40 bg-emerald-400/20"
                            : "border-white/[0.15]"
                        )}
                      >
                        {checked.has(i) && (
                          <span className="block w-2 h-2 rounded-sm bg-emerald-400" />
                        )}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={cn(
                        "text-sm text-white/70",
                        checked.has(i) && "line-through text-white/30"
                      )}
                    >
                      {ing}
                    </span>
                  </button>
                ))}
              </div>
              {cookMode && (
                <p className="text-[10px] text-white/20 mt-2">
                  {checked.size}/{ingredients.length} listos
                </p>
              )}
            </div>
          )}

          {recipe.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">
                Instrucciones
              </p>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                {recipe.description}
              </p>
            </div>
          )}

          {ingredients.length === 0 && !recipe.description && (
            <p className="text-sm text-white/25 text-center py-6">Sin detalles</p>
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
            {pinning ? "Agregando…" : "Cocinar hoy"}
          </button>
        </div>
      </div>
    </div>
  );
}
