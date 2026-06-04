"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, ChevronLeft, ChevronRight, Check, X,
  Wallet, AlertCircle, Pencil, Trash2, PiggyBank,
  Home, User, HandCoins, ArrowLeftRight, BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import { useRealtimeInvalidate } from "@/hooks/use-realtime-invalidate";
import { cn } from "@/lib/utils";
import type { Finance, RecurringExpense, SavingsGoal, FinanceType } from "@/types/supabase";

const CATEGORIES = ["Comida", "Casa", "Servicios", "Entretenimiento", "Salud", "Transporte", "Ropa", "Otros"];
const MONTH_NAMES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string) {
  const d = new Date(s.length === 10 ? s + "T00:00:00" : s);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(1, pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct >= 100 ? "#34d399" : "#fbbf24"}
        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
      />
    </svg>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[#1c1c1c] rounded-2xl w-full max-w-[360px] p-5 flex flex-col gap-4 shadow-2xl border border-white/[0.06] max-h-[85vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

type Tab = "hogar" | "personal" | "resumen";

export function FinancesClient() {
  const { homeId, userId, fullName } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState<Tab>("hogar");
  const [monthOffset, setMonthOffset] = useState(0);

  // action card state
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [activeRec, setActiveRec] = useState<RecurringExpense | null>(null);
  const [activeTx, setActiveTx] = useState<Finance | null>(null);

  // form overlay state
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddRec, setShowAddRec] = useState(false);
  const [editFinance, setEditFinance] = useState<Finance | null>(null);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [editRec, setEditRec] = useState<RecurringExpense | null>(null);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  // transaction form fields
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<FinanceType>("expense");
  const [txCategory, setTxCategory] = useState("");
  const [txDueDate, setTxDueDate] = useState("");
  const [txIsPaid, setTxIsPaid] = useState(false);
  const [txScope, setTxScope] = useState<Tab>("personal");
  const [txPartnerShare, setTxPartnerShare] = useState("");
  const [showSplit, setShowSplit] = useState(false);

  // recurring form fields
  const [recTitle, setRecTitle] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recCategory, setRecCategory] = useState("");
  const [recDay, setRecDay] = useState("1");
  const [recPaidBy, setRecPaidBy] = useState<string | null>(null);

  // goal form fields
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  // ── open/close helpers ─────────────────────────────────────────────────────
  function openAddTx() {
    setTxScope(activeTab);
    setShowSplit(false);
    setTxPartnerShare("");
    setShowAddTx(true);
  }

  function openEditFinance(f: Finance) {
    setActiveTx(null);
    setTxTitle(f.title); setTxAmount(String(f.amount));
    setTxType(f.type as FinanceType); setTxCategory(f.category ?? "");
    setTxDueDate(f.due_date ?? ""); setTxIsPaid(f.is_paid ?? false);
    setTxScope((f.scope ?? "personal") as Tab);
    const ps = f.partner_share ?? 0;
    setShowSplit(ps > 0);
    setTxPartnerShare(ps > 0 ? String(ps) : "");
    setEditFinance(f);
  }
  function closeFinanceForm() {
    setShowAddTx(false); setEditFinance(null);
    setTxTitle(""); setTxAmount(""); setTxType("expense");
    setTxCategory(""); setTxDueDate(""); setTxIsPaid(false);
    setTxPartnerShare(""); setShowSplit(false);
  }

  function openEditGoal(g: SavingsGoal) {
    setActiveGoal(null);
    setGoalTitle(g.title); setGoalTarget(String(g.target_amount));
    setGoalCurrent(String(g.current_amount ?? 0)); setGoalDeadline(g.deadline ?? "");
    setEditGoal(g);
  }
  function closeGoalForm() {
    setShowAddGoal(false); setEditGoal(null);
    setGoalTitle(""); setGoalTarget(""); setGoalCurrent(""); setGoalDeadline("");
  }

  function openEditRec(r: RecurringExpense) {
    setActiveRec(null);
    setRecTitle(r.title); setRecAmount(String(r.amount));
    setRecCategory(r.category ?? ""); setRecDay(String(r.recurrence_day ?? 1));
    setRecPaidBy(r.paid_by ?? null);
    setEditRec(r);
  }
  function closeRecForm() {
    setShowAddRec(false); setEditRec(null);
    setRecTitle(""); setRecAmount(""); setRecCategory(""); setRecDay("1"); setRecPaidBy(null);
  }

  // ── month helpers ──────────────────────────────────────────────────────────
  const viewDate = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset],
  );
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthLabel = `${MONTH_NAMES_ES[viewMonth]} ${viewYear}`;

  // ── queries ────────────────────────────────────────────────────────────────
  const { data: finances = [], isLoading: loadingTx, isError: errorTx, refetch: refetchTx } = useQuery({
    queryKey: ["finances", homeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("finances").select("*")
        .eq("home_id", homeId).is("deleted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Finance[];
    },
    enabled: !!homeId,
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring_expenses", homeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("recurring_expenses").select("*")
        .eq("home_id", homeId).order("recurrence_day", { ascending: true });
      if (error) throw error;
      return data as RecurringExpense[];
    },
    enabled: !!homeId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["savings_goals", homeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("savings_goals").select("*")
        .eq("home_id", homeId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavingsGoal[];
    },
    enabled: !!homeId,
  });

  const { data: partner } = useQuery({
    queryKey: ["partner", homeId, userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("id, full_name")
        .eq("home_id", homeId)
        .neq("id", userId)
        .maybeSingle();
      return data as { id: string; full_name: string } | null;
    },
    enabled: !!homeId && !!userId,
  });

  useRealtimeInvalidate({ channel: "finances", filter: homeId, queryKey: ["finances", homeId], tables: ["finances"] });
  useRealtimeInvalidate({ channel: "recurring_expenses", filter: homeId, queryKey: ["recurring_expenses", homeId], tables: ["recurring_expenses"] });
  useRealtimeInvalidate({ channel: "savings_goals", filter: homeId, queryKey: ["savings_goals", homeId], tables: ["savings_goals"] });

  // ── derived labels ─────────────────────────────────────────────────────────
  const myFirstName = (fullName ?? "Yo").split(" ")[0];
  const partnerFirstName = (partner?.full_name ?? "Pareja").split(" ")[0];

  // ── derived data ───────────────────────────────────────────────────────────
  const monthFinances = useMemo(
    () => finances.filter(f => (f.due_date ?? f.created_at ?? "").startsWith(monthKey)),
    [finances, monthKey],
  );

  // Hogar tab
  const hogarMonth = useMemo(() => monthFinances.filter(f => f.scope === "hogar"), [monthFinances]);
  const hogarUnpaid = useMemo(() => hogarMonth.filter(f => f.type === "expense" && !f.is_paid), [hogarMonth]);
  const hogarPaid = useMemo(() => hogarMonth.filter(f => f.type === "expense" && !!f.is_paid), [hogarMonth]);
  const hogarIncome = useMemo(() => hogarMonth.filter(f => f.type === "income"), [hogarMonth]);

  // Personal tab
  const myMonth = useMemo(
    () => monthFinances.filter(f => (f.scope ?? "personal") === "personal" && f.created_by === userId),
    [monthFinances, userId],
  );
  const myUnpaid = useMemo(() => myMonth.filter(f => f.type === "expense" && !f.is_paid), [myMonth]);
  const myPaid = useMemo(() => myMonth.filter(f => f.type === "expense" && !!f.is_paid), [myMonth]);
  const myIncome = useMemo(() => myMonth.filter(f => f.type === "income"), [myMonth]);
  const myTotalIncome = useMemo(() => myIncome.reduce((s, f) => s + f.amount, 0), [myIncome]);
  const myTotalExpense = useMemo(() => myMonth.filter(f => f.type === "expense").reduce((s, f) => s + f.amount, 0), [myMonth]);
  const myBalance = myTotalIncome - myTotalExpense;
  const myUnpaidTotal = useMemo(() => myUnpaid.reduce((s, f) => s + f.amount, 0), [myUnpaid]);

  // Splits (all-time, unsettled)
  const mySplits = useMemo(
    () => finances.filter(f => f.created_by === userId && (f.partner_share ?? 0) > 0 && !f.split_settled),
    [finances, userId],
  );
  const theirSplits = useMemo(
    () => finances.filter(f => f.created_by !== userId && (f.partner_share ?? 0) > 0 && !f.split_settled),
    [finances, userId],
  );

  // Recurring + contribution bar
  const activeRecurring = useMemo(() => recurring.filter(r => r.is_active), [recurring]);
  const contributions = useMemo(() => {
    const myTotal = activeRecurring.filter(r => r.paid_by === userId).reduce((s, r) => s + r.amount, 0);
    const partnerTotal = partner
      ? activeRecurring.filter(r => r.paid_by === partner.id).reduce((s, r) => s + r.amount, 0)
      : 0;
    const unassigned = activeRecurring.filter(r => !r.paid_by).reduce((s, r) => s + r.amount, 0);
    return { myTotal, partnerTotal, unassigned };
  }, [activeRecurring, userId, partner]);
  const hasContributions = contributions.myTotal > 0 || contributions.partnerTotal > 0;

  const paidRecurringMap = useMemo(() => {
    const map = new Map<string, string>();
    finances.forEach(f => {
      if (f.recurring_expense_id && f.is_paid && (f.due_date ?? f.created_at ?? "").startsWith(monthKey))
        map.set(f.recurring_expense_id, f.id);
    });
    return map;
  }, [finances, monthKey]);

  // Resumen tab
  const last6Months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entries = finances.filter(f => (f.due_date ?? f.created_at ?? "").startsWith(key));
      const income = entries.filter(f => f.type === "income").reduce((s, f) => s + f.amount, 0);
      const expense = entries.filter(f => f.type === "expense").reduce((s, f) => s + f.amount, 0);
      return { key, label: MONTH_NAMES_ES[d.getMonth()].slice(0, 3), income, expense };
    });
  }, [finances, today]);

  const last6Max = useMemo(
    () => Math.max(...last6Months.flatMap(m => [m.income, m.expense]), 1),
    [last6Months],
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    myMonth.filter(f => f.type === "expense").forEach(f => {
      const cat = f.category ?? "Sin categoría";
      map.set(cat, (map.get(cat) ?? 0) + f.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => ({ cat, amount }));
  }, [myMonth]);

  const splitsTotals = useMemo(() => ({
    theyOweMe: mySplits.reduce((s, f) => s + (f.partner_share ?? 0), 0),
    iOweThem: theirSplits.reduce((s, f) => s + (f.partner_share ?? 0), 0),
  }), [mySplits, theirSplits]);

  // ── mutations ──────────────────────────────────────────────────────────────
  const addTx = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(txAmount.replace(",", "."));
      if (!txTitle.trim() || isNaN(amount)) throw new Error("invalid");
      const partnerShareVal = showSplit && txPartnerShare ? parseFloat(txPartnerShare.replace(",", ".")) : null;
      const { error } = await supabase.from("finances").insert({
        title: txTitle.trim(), amount, type: txType,
        category: txCategory || null, due_date: txDueDate || null,
        is_paid: txIsPaid, home_id: homeId, created_by: userId,
        scope: txScope, partner_share: partnerShareVal, split_settled: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finances", homeId] }); closeFinanceForm(); },
    onError: () => toast.error("No se pudo agregar"),
  });

  const updateTx = useMutation({
    mutationFn: async () => {
      if (!editFinance) return;
      const amount = parseFloat(txAmount.replace(",", "."));
      if (!txTitle.trim() || isNaN(amount)) throw new Error("invalid");
      const partnerShareVal = showSplit && txPartnerShare ? parseFloat(txPartnerShare.replace(",", ".")) : null;
      const { error } = await supabase.from("finances").update({
        title: txTitle.trim(), amount, type: txType,
        category: txCategory || null, due_date: txDueDate || null, is_paid: txIsPaid,
        scope: txScope, partner_share: partnerShareVal,
      }).eq("id", editFinance.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finances", homeId] }); closeFinanceForm(); },
    onError: () => toast.error("No se pudo guardar"),
  });

  const deleteTx = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finances").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finances", homeId] }); setActiveTx(null); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean | null }) => {
      const { error } = await supabase.from("finances").update({ is_paid: !is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finances", homeId] }),
    onError: () => toast.error("No se pudo actualizar"),
  });

  const settleSplit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finances").update({ split_settled: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finances", homeId] }),
    onError: () => toast.error("No se pudo marcar"),
  });

  const addRec = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(recAmount.replace(",", "."));
      if (!recTitle.trim() || isNaN(amount)) throw new Error("invalid");
      const { error } = await supabase.from("recurring_expenses").insert({
        title: recTitle.trim(), amount, category: recCategory || null,
        recurrence_day: parseInt(recDay, 10), is_active: true,
        home_id: homeId, created_by: userId, paid_by: recPaidBy,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recurring_expenses", homeId] }); closeRecForm(); },
    onError: () => toast.error("No se pudo agregar"),
  });

  const updateRec = useMutation({
    mutationFn: async () => {
      if (!editRec) return;
      const amount = parseFloat(recAmount.replace(",", "."));
      if (!recTitle.trim() || isNaN(amount)) throw new Error("invalid");
      const { error } = await supabase.from("recurring_expenses").update({
        title: recTitle.trim(), amount, category: recCategory || null,
        recurrence_day: parseInt(recDay, 10), paid_by: recPaidBy,
      }).eq("id", editRec.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recurring_expenses", homeId] }); closeRecForm(); },
    onError: () => toast.error("No se pudo guardar"),
  });

  const deleteRec = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recurring_expenses", homeId] }); setActiveRec(null); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const target = parseFloat(goalTarget.replace(",", "."));
      if (!goalTitle.trim() || isNaN(target)) throw new Error("invalid");
      const { error } = await supabase.from("savings_goals").insert({
        title: goalTitle.trim(), target_amount: target,
        current_amount: parseFloat(goalCurrent.replace(",", ".")) || 0,
        deadline: goalDeadline || null, home_id: homeId, created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["savings_goals", homeId] }); closeGoalForm(); },
    onError: () => toast.error("No se pudo agregar"),
  });

  const updateGoal = useMutation({
    mutationFn: async () => {
      if (!editGoal) return;
      const target = parseFloat(goalTarget.replace(",", "."));
      if (!goalTitle.trim() || isNaN(target)) throw new Error("invalid");
      const { error } = await supabase.from("savings_goals").update({
        title: goalTitle.trim(), target_amount: target,
        current_amount: parseFloat(goalCurrent.replace(",", ".")) || 0,
        deadline: goalDeadline || null,
      }).eq("id", editGoal.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["savings_goals", homeId] }); closeGoalForm(); },
    onError: () => toast.error("No se pudo guardar"),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("savings_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["savings_goals", homeId] }); setActiveGoal(null); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const depositToGoal = useMutation({
    mutationFn: async () => {
      if (!depositGoal) return;
      const amount = parseFloat(depositAmount.replace(",", "."));
      if (isNaN(amount) || amount <= 0) throw new Error("invalid");
      const { error } = await supabase.from("savings_goals")
        .update({ current_amount: (depositGoal.current_amount ?? 0) + amount })
        .eq("id", depositGoal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings_goals", homeId] });
      setDepositGoal(null); setDepositAmount("");
    },
    onError: () => toast.error("No se pudo actualizar"),
  });

  const markRecurringPaid = useMutation({
    mutationFn: async (r: RecurringExpense) => {
      const day = String(Math.min(r.recurrence_day ?? 1, 28)).padStart(2, "0");
      const { error } = await supabase.from("finances").insert({
        title: r.title, amount: r.amount, type: "expense",
        category: r.category ?? null, is_paid: true, recurring_expense_id: r.id,
        due_date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${day}`,
        home_id: homeId, created_by: userId, scope: "hogar",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finances", homeId] }),
    onError: () => toast.error("No se pudo registrar"),
  });

  const unmarkRecurringPaid = useMutation({
    mutationFn: async (financeId: string) => {
      const { error } = await supabase.from("finances")
        .update({ deleted_at: new Date().toISOString() }).eq("id", financeId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finances", homeId] }),
    onError: () => toast.error("No se pudo desmarcar"),
  });

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-6 pb-2 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">Finanzas</h1>
          <div className="flex items-center gap-0.5 mt-0.5">
            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1 text-white/25 active:text-white/60">
              <ChevronLeft size={13} />
            </button>
            <span className="text-[13px] text-white/40">{monthLabel}</span>
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1 text-white/25 active:text-white/60">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
        <button
          onClick={openAddTx}
          className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center active:scale-95 transition-transform mt-1"
        >
          <Plus size={18} className="text-black" />
        </button>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex bg-white/[0.05] rounded-xl p-0.5 gap-0.5">
          {([
            { id: "hogar", icon: <Home size={12} />, label: "Hogar" },
            { id: "personal", icon: <User size={12} />, label: "Personal" },
            { id: "resumen", icon: <BarChart2 size={12} />, label: "Resumen" },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2 rounded-[10px] text-[12px] font-medium transition-all",
                activeTab === tab.id
                  ? "bg-[#2a2a2a] text-white shadow-sm"
                  : "text-white/35 active:text-white/60",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">

        {/* ══════════ HOGAR TAB ══════════ */}
        {activeTab === "hogar" && (
          <>
            {/* Contribution bar */}
            {hasContributions && (() => {
              const total = contributions.myTotal + contributions.partnerTotal;
              const myPct = total > 0 ? contributions.myTotal / total : 0.5;
              return (
                <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3">
                  <p className="text-[11px] uppercase tracking-widest text-white/25">Compromisos del hogar</p>
                  <div className="h-1.5 rounded-full overflow-hidden flex bg-white/[0.06]">
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${myPct * 100}%` }} />
                    <div className="h-full bg-violet-400 transition-all" style={{ width: `${(1 - myPct) * 100}%` }} />
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-[11px] text-white/40">{myFirstName}</span>
                      </div>
                      <p className="text-[15px] font-semibold text-white/80 tabular-nums mt-0.5">{fmtCurrency(contributions.myTotal)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-[11px] text-white/40">{partnerFirstName}</span>
                      </div>
                      <p className="text-[15px] font-semibold text-white/80 tabular-nums mt-0.5">{fmtCurrency(contributions.partnerTotal)}</p>
                    </div>
                  </div>
                  {contributions.unassigned > 0 && (
                    <p className="text-[11px] text-white/25">{fmtCurrency(contributions.unassigned)} en gastos sin asignar</p>
                  )}
                </div>
              );
            })()}

            {/* Recurring bills */}
            {activeRecurring.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-widest text-white/25">Gastos fijos</p>
                  <button onClick={() => setShowAddRec(true)} className="text-white/25 active:text-white/60">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                  {activeRecurring.map(r => {
                    const paid = paidRecurringMap.has(r.id);
                    const financeId = paidRecurringMap.get(r.id);
                    const isMe = r.paid_by === userId;
                    const isPartner = r.paid_by === partner?.id;
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => { if (paid && financeId) unmarkRecurringPaid.mutate(financeId); else markRecurringPaid.mutate(r); }}
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors border-2",
                            paid ? "bg-emerald-400 border-emerald-400" : "border-white/20 active:border-emerald-400",
                          )}
                        >
                          {paid && <Check size={11} className="text-black" />}
                        </button>
                        <button onClick={() => setActiveRec(r)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn("text-[14px] truncate transition-colors", paid ? "text-white/30 line-through" : "text-white/70")}>
                                {r.title}
                              </p>
                              {(isMe || isPartner) && (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full shrink-0 leading-none",
                                  isMe ? "bg-amber-400/15 text-amber-400" : "bg-violet-400/15 text-violet-400",
                                )}>
                                  {isMe ? myFirstName : partnerFirstName}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/30">
                              {r.category ? `${r.category} · ` : ""}Día {r.recurrence_day ?? 1}
                              {!paid && <span className="text-amber-400"> · pendiente</span>}
                            </p>
                          </div>
                          <span className={cn("text-[15px] font-semibold tabular-nums shrink-0 transition-colors", paid ? "text-white/25" : "text-white/50")}>
                            {fmtCurrency(r.amount)}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-white/20">¿Tienen gastos fijos del hogar?</p>
                <button onClick={() => setShowAddRec(true)} className="text-[12px] text-amber-400/60 active:text-amber-400">Agregar</button>
              </div>
            )}

            {/* Savings goals */}
            {goals.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-widest text-white/25">Metas de ahorro</p>
                  <button onClick={() => setShowAddGoal(true)} className="text-white/25 active:text-white/60">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {goals.map(g => {
                    const pct = Math.min(100, Math.round(((g.current_amount ?? 0) / g.target_amount) * 100));
                    const done = pct >= 100;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setActiveGoal(g)}
                        className={cn(
                          "rounded-2xl border p-3 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform text-left",
                          done ? "bg-emerald-400/10 border-emerald-400/20" : "bg-[#1a1a1a] border-white/[0.06]",
                        )}
                      >
                        <div className="relative">
                          <ProgressRing pct={pct} size={44} />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/70">
                            {pct}%
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-white/80 text-center leading-tight line-clamp-2 w-full">{g.title}</p>
                        <p className="text-[10px] text-white/30 text-center tabular-nums">
                          {fmtCurrency(g.current_amount ?? 0)}<br />de {fmtCurrency(g.target_amount)}
                        </p>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="rounded-2xl border border-dashed border-white/[0.08] p-3 flex flex-col items-center justify-center gap-1 text-white/20 active:text-white/40 min-h-[120px] transition-colors"
                  >
                    <Plus size={18} />
                    <span className="text-[11px]">Nueva meta</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-white/20">¿Tienen metas de ahorro?</p>
                <button onClick={() => setShowAddGoal(true)} className="text-[12px] text-amber-400/60 active:text-amber-400">Agregar meta</button>
              </div>
            )}

            {/* Hogar transactions */}
            {loadingTx ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[58px] bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : hogarMonth.length > 0 ? (
              <div className="flex flex-col gap-4">
                {hogarUnpaid.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/25 mb-2">Por pagar</p>
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {hogarUnpaid.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => togglePaid.mutate({ id: f.id, is_paid: f.is_paid })}
                            className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0 transition-colors active:border-emerald-400"
                          />
                          <button onClick={() => setActiveTx(f)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-white/80 truncate">{f.title}</p>
                              <p className="text-[11px] text-white/30">
                                {f.category ? `${f.category} · ` : ""}
                                {f.due_date ? fmtDate(f.due_date) : f.created_at ? fmtDate(f.created_at) : ""}
                              </p>
                            </div>
                            <span className="text-[15px] font-semibold text-red-400 tabular-nums shrink-0">{fmtCurrency(f.amount)}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {hogarIncome.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/25 mb-2">Ingresos</p>
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {hogarIncome.map(f => (
                        <button key={f.id} onClick={() => setActiveTx(f)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-white/80 truncate">{f.title}</p>
                            <p className="text-[11px] text-white/30">{f.category ? `${f.category} · ` : ""}{f.created_at ? fmtDate(f.created_at) : ""}</p>
                          </div>
                          <span className="text-[15px] font-semibold text-emerald-400 tabular-nums shrink-0">+{fmtCurrency(f.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {hogarPaid.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/25 mb-2">Pagado</p>
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {hogarPaid.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => togglePaid.mutate({ id: f.id, is_paid: f.is_paid })}
                            className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shrink-0"
                          >
                            <Check size={11} className="text-black" />
                          </button>
                          <button onClick={() => setActiveTx(f)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-white/30 truncate line-through">{f.title}</p>
                              <p className="text-[11px] text-white/20">
                                {f.category ? `${f.category} · ` : ""}
                                {f.due_date ? fmtDate(f.due_date) : f.created_at ? fmtDate(f.created_at) : ""}
                              </p>
                            </div>
                            <span className="text-[15px] font-semibold text-white/30 tabular-nums shrink-0">{fmtCurrency(f.amount)}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <Home size={28} className="text-white/15" />
                <p className="text-[14px] text-white/30">Sin gastos del hogar este mes</p>
                <p className="text-[12px] text-white/20">Toca + para registrar uno</p>
              </div>
            )}
          </>
        )}

        {/* ══════════ PERSONAL TAB ══════════ */}
        {activeTab === "personal" && (
          <>
            {/* Summary cards */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/25 mb-1">Tu balance del mes</p>
                <p className={cn("text-[30px] font-bold leading-none tabular-nums", myBalance >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {myBalance >= 0 ? "+" : ""}{fmtCurrency(myBalance)}
                </p>
                {myUnpaidTotal > 0 && (
                  <p className="text-[12px] text-amber-400/80 mt-1.5">{fmtCurrency(myUnpaidTotal)} pendiente por pagar</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-emerald-400/[0.07] rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-400/60 mb-0.5">Ingresos</p>
                  <p className="text-[15px] font-semibold text-emerald-400 tabular-nums">{fmtCurrency(myTotalIncome)}</p>
                </div>
                <div className="bg-red-400/[0.07] rounded-xl px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-red-400/60 mb-0.5">Gastos</p>
                  <p className="text-[15px] font-semibold text-red-400 tabular-nums">{fmtCurrency(myTotalExpense)}</p>
                </div>
              </div>
            </div>

            {/* My transactions */}
            {loadingTx ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[58px] bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : errorTx ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <AlertCircle size={28} className="text-white/20" />
                <p className="text-[14px] text-white/40">No se pudieron cargar los movimientos</p>
                <button onClick={() => refetchTx()} className="text-sm text-amber-400 underline">Reintentar</button>
              </div>
            ) : myMonth.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Wallet size={32} className="text-white/15" />
                <p className="text-[14px] text-white/30">Sin movimientos personales este mes</p>
                <p className="text-[12px] text-white/20">Toca + para registrar uno</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {myUnpaid.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/25 mb-2">Por pagar</p>
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {myUnpaid.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => togglePaid.mutate({ id: f.id, is_paid: f.is_paid })}
                            className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0 transition-colors active:border-emerald-400"
                          />
                          <button onClick={() => setActiveTx(f)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-white/80 truncate">{f.title}</p>
                              <p className="text-[11px] text-white/30">
                                {f.category ? `${f.category} · ` : ""}
                                {f.due_date ? fmtDate(f.due_date) : f.created_at ? fmtDate(f.created_at) : ""}
                                {(f.partner_share ?? 0) > 0 && <span className="text-violet-400"> · dividido</span>}
                              </p>
                            </div>
                            <span className="text-[15px] font-semibold text-red-400 tabular-nums shrink-0">{fmtCurrency(f.amount)}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {myIncome.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/25 mb-2">Ingresos</p>
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {myIncome.map(f => (
                        <button key={f.id} onClick={() => setActiveTx(f)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-white/80 truncate">{f.title}</p>
                            <p className="text-[11px] text-white/30">{f.category ? `${f.category} · ` : ""}{f.created_at ? fmtDate(f.created_at) : ""}</p>
                          </div>
                          <span className="text-[15px] font-semibold text-emerald-400 tabular-nums shrink-0">+{fmtCurrency(f.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {myPaid.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-white/25 mb-2">Pagado</p>
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {myPaid.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => togglePaid.mutate({ id: f.id, is_paid: f.is_paid })}
                            className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center shrink-0"
                          >
                            <Check size={11} className="text-black" />
                          </button>
                          <button onClick={() => setActiveTx(f)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-white/30 truncate line-through">{f.title}</p>
                              <p className="text-[11px] text-white/20">
                                {f.category ? `${f.category} · ` : ""}
                                {f.due_date ? fmtDate(f.due_date) : f.created_at ? fmtDate(f.created_at) : ""}
                              </p>
                            </div>
                            <span className="text-[15px] font-semibold text-white/30 tabular-nums shrink-0">{fmtCurrency(f.amount)}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Splits section */}
            {(mySplits.length > 0 || theirSplits.length > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] uppercase tracking-widest text-white/25">Cuentas divididas</p>
                  <ArrowLeftRight size={11} className="text-white/20" />
                </div>
                <div className="flex flex-col gap-2">
                  {mySplits.length > 0 && (
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {mySplits.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <HandCoins size={15} className="text-amber-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-white/70 truncate">{f.title}</p>
                            <p className="text-[11px] text-white/30">
                              {partnerFirstName} te debe · {f.created_at ? fmtDate(f.created_at) : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[14px] font-semibold text-amber-400 tabular-nums">{fmtCurrency(f.partner_share ?? 0)}</span>
                            <button
                              onClick={() => settleSplit.mutate(f.id)}
                              className="text-[11px] text-white/30 border border-white/10 px-2 py-1 rounded-lg active:bg-white/[0.06]"
                            >
                              Saldar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {theirSplits.length > 0 && (
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] divide-y divide-white/[0.05]">
                      {theirSplits.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <HandCoins size={15} className="text-violet-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-white/70 truncate">{f.title}</p>
                            <p className="text-[11px] text-white/30">
                              Le debes a {partnerFirstName} · {f.created_at ? fmtDate(f.created_at) : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[14px] font-semibold text-violet-400 tabular-nums">{fmtCurrency(f.partner_share ?? 0)}</span>
                            <button
                              onClick={() => settleSplit.mutate(f.id)}
                              className="text-[11px] text-white/30 border border-white/10 px-2 py-1 rounded-lg active:bg-white/[0.06]"
                            >
                              Saldar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ RESUMEN TAB ══════════ */}
        {activeTab === "resumen" && (
          <>
            {/* Monthly trend chart */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] p-4">
              <p className="text-[11px] uppercase tracking-widest text-white/25 mb-4">Tendencia — últimos 6 meses</p>
              <div className="flex items-end gap-1.5 h-[72px]">
                {last6Months.map(m => {
                  const incomeH = Math.round((m.income / last6Max) * 60);
                  const expenseH = Math.round((m.expense / last6Max) * 60);
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-0.5 w-full">
                        <div
                          className="flex-1 bg-emerald-400/50 rounded-t-[3px] transition-all"
                          style={{ height: Math.max(incomeH, 2) }}
                        />
                        <div
                          className="flex-1 bg-red-400/50 rounded-t-[3px] transition-all"
                          style={{ height: Math.max(expenseH, 2) }}
                        />
                      </div>
                      <span className="text-[9px] text-white/25 capitalize">{m.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400/50" /><span className="text-[10px] text-white/30">Ingresos</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400/50" /><span className="text-[10px] text-white/30">Gastos</span></div>
              </div>
            </div>

            {/* Personal category breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/25 mb-3">
                  Gastos personales · {MONTH_NAMES_ES[viewMonth]}
                </p>
                <div className="flex flex-col gap-2.5">
                  {categoryBreakdown.map(({ cat, amount }) => {
                    const pct = Math.round((amount / myTotalExpense) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] text-white/70">{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/30">{pct}%</span>
                            <span className="text-[13px] font-medium text-white/60 tabular-nums">{fmtCurrency(amount)}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400/50 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hogar commitments */}
            {activeRecurring.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/25 mb-3">Compromisos mensuales del hogar</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-[13px] text-white/60">{myFirstName}</span>
                    </div>
                    <span className="text-[14px] font-semibold text-white/70 tabular-nums">{fmtCurrency(contributions.myTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      <span className="text-[13px] text-white/60">{partnerFirstName}</span>
                    </div>
                    <span className="text-[14px] font-semibold text-white/70 tabular-nums">{fmtCurrency(contributions.partnerTotal)}</span>
                  </div>
                  {contributions.unassigned > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-white/30">Sin asignar</span>
                      <span className="text-[14px] font-semibold text-white/30 tabular-nums">{fmtCurrency(contributions.unassigned)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/[0.06] pt-2 mt-1 flex items-center justify-between">
                    <span className="text-[12px] text-white/25">Total mensual</span>
                    <span className="text-[14px] font-semibold text-white/50 tabular-nums">
                      {fmtCurrency(contributions.myTotal + contributions.partnerTotal + contributions.unassigned)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Pending splits */}
            {(splitsTotals.theyOweMe > 0 || splitsTotals.iOweThem > 0) && (() => {
              const net = splitsTotals.theyOweMe - splitsTotals.iOweThem;
              return (
                <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.08] p-4">
                  <p className="text-[11px] uppercase tracking-widest text-white/25 mb-3">Cuentas pendientes</p>
                  <div className="flex flex-col gap-2">
                    {splitsTotals.theyOweMe > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-white/60">{partnerFirstName} te debe</span>
                        <span className="text-[14px] font-semibold text-amber-400 tabular-nums">+{fmtCurrency(splitsTotals.theyOweMe)}</span>
                      </div>
                    )}
                    {splitsTotals.iOweThem > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-white/60">Le debes a {partnerFirstName}</span>
                        <span className="text-[14px] font-semibold text-violet-400 tabular-nums">-{fmtCurrency(splitsTotals.iOweThem)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/[0.06] pt-2 mt-1 flex items-center justify-between">
                      <span className="text-[12px] text-white/25">Balance neto</span>
                      <span className={cn("text-[15px] font-bold tabular-nums", net >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {net >= 0 ? "+" : ""}{fmtCurrency(net)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Empty state */}
            {finances.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12">
                <BarChart2 size={32} className="text-white/15" />
                <p className="text-[14px] text-white/30">Aún no hay datos para resumir</p>
                <p className="text-[12px] text-white/20">Empieza registrando gastos en Hogar o Personal</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ACTION CARDS
      ══════════════════════════════════════════════════════════ */}

      {activeGoal && (() => {
        const g = activeGoal;
        const pct = Math.min(100, Math.round(((g.current_amount ?? 0) / g.target_amount) * 100));
        return (
          <Overlay onClose={() => setActiveGoal(null)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-white leading-tight">{g.title}</p>
                <p className="text-[12px] text-white/40 mt-0.5 tabular-nums">
                  {fmtCurrency(g.current_amount ?? 0)} / {fmtCurrency(g.target_amount)} · {pct}%
                </p>
              </div>
              <button onClick={() => setActiveGoal(null)} className="text-white/40 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-1 -mx-1">
              <button
                onClick={() => { setActiveGoal(null); setDepositGoal(g); setDepositAmount(""); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-white/[0.06] transition-colors text-left"
              >
                <PiggyBank size={16} className="text-amber-400 shrink-0" />
                <span className="text-[14px] text-white/80">Abonar</span>
              </button>
              <button
                onClick={() => openEditGoal(g)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-white/[0.06] transition-colors text-left"
              >
                <Pencil size={16} className="text-white/40 shrink-0" />
                <span className="text-[14px] text-white/80">Editar meta</span>
              </button>
              <button
                onClick={() => deleteGoal.mutate(g.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-red-400/10 transition-colors text-left"
              >
                <Trash2 size={16} className="text-red-400 shrink-0" />
                <span className="text-[14px] text-red-400">Eliminar meta</span>
              </button>
            </div>
          </Overlay>
        );
      })()}

      {activeRec && (
        <Overlay onClose={() => setActiveRec(null)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-white leading-tight">{activeRec.title}</p>
              <p className="text-[12px] text-white/40 mt-0.5">
                {activeRec.category ? `${activeRec.category} · ` : ""}Día {activeRec.recurrence_day ?? 1} · {fmtCurrency(activeRec.amount)}
              </p>
            </div>
            <button onClick={() => setActiveRec(null)} className="text-white/40 shrink-0"><X size={20} /></button>
          </div>
          <div className="flex flex-col gap-1 -mx-1">
            <button
              onClick={() => openEditRec(activeRec)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-white/[0.06] transition-colors text-left"
            >
              <Pencil size={16} className="text-white/40 shrink-0" />
              <span className="text-[14px] text-white/80">Editar gasto fijo</span>
            </button>
            <button
              onClick={() => deleteRec.mutate(activeRec.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-red-400/10 transition-colors text-left"
            >
              <Trash2 size={16} className="text-red-400 shrink-0" />
              <span className="text-[14px] text-red-400">Eliminar gasto fijo</span>
            </button>
          </div>
        </Overlay>
      )}

      {activeTx && (
        <Overlay onClose={() => setActiveTx(null)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-white leading-tight">{activeTx.title}</p>
              <p className="text-[12px] text-white/40 mt-0.5">
                {activeTx.category ? `${activeTx.category} · ` : ""}
                {activeTx.due_date ? fmtDate(activeTx.due_date) : activeTx.created_at ? fmtDate(activeTx.created_at) : ""}
                {" · "}
                <span className={activeTx.type === "income" ? "text-emerald-400" : "text-red-400"}>
                  {activeTx.type === "income" ? "+" : ""}{fmtCurrency(activeTx.amount)}
                </span>
              </p>
            </div>
            <button onClick={() => setActiveTx(null)} className="text-white/40 shrink-0"><X size={20} /></button>
          </div>
          <div className="flex flex-col gap-1 -mx-1">
            <button
              onClick={() => openEditFinance(activeTx)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-white/[0.06] transition-colors text-left"
            >
              <Pencil size={16} className="text-white/40 shrink-0" />
              <span className="text-[14px] text-white/80">Editar movimiento</span>
            </button>
            <button
              onClick={() => deleteTx.mutate(activeTx.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-red-400/10 transition-colors text-left"
            >
              <Trash2 size={16} className="text-red-400 shrink-0" />
              <span className="text-[14px] text-red-400">Eliminar movimiento</span>
            </button>
          </div>
        </Overlay>
      )}

      {/* ══════════════════════════════════════════════════════════
          FORM OVERLAYS
      ══════════════════════════════════════════════════════════ */}

      {(showAddTx || editFinance) && (
        <Overlay onClose={closeFinanceForm}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{editFinance ? "Editar movimiento" : "Nuevo movimiento"}</h2>
            <button onClick={closeFinanceForm} className="text-white/40"><X size={20} /></button>
          </div>
          {/* Scope */}
          <div className="grid grid-cols-2 gap-2">
            {(["personal", "hogar"] as Tab[]).map(s => (
              <button
                key={s} onClick={() => setTxScope(s)}
                className={cn(
                  "py-2 rounded-xl text-sm font-medium border transition-colors flex items-center justify-center gap-1.5",
                  txScope === s
                    ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
                    : "bg-white/[0.06] text-white/40 border-transparent",
                )}
              >
                {s === "hogar" ? <Home size={13} /> : <User size={13} />}
                {s === "hogar" ? "Hogar" : "Personal"}
              </button>
            ))}
          </div>
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as FinanceType[]).map(t => (
              <button
                key={t} onClick={() => setTxType(t)}
                className={cn(
                  "py-2 rounded-xl text-sm font-medium border transition-colors",
                  txType === t
                    ? t === "expense" ? "bg-red-400/15 text-red-400 border-red-400/30" : "bg-emerald-400/15 text-emerald-400 border-emerald-400/30"
                    : "bg-white/[0.06] text-white/40 border-transparent",
                )}
              >
                {t === "expense" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>
          <input placeholder="Título" value={txTitle} onChange={e => setTxTitle(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <input type="number" inputMode="decimal" placeholder="Monto total" value={txAmount} onChange={e => setTxAmount(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setTxCategory(txCategory === c ? "" : c)}
                className={cn("px-2.5 py-1 rounded-full text-[11px] transition-colors",
                  txCategory === c ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-white/[0.06] text-white/40")}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="date" value={txDueDate} onChange={e => setTxDueDate(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="flex-1 bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/60 outline-none" />
            <button onClick={() => setTxIsPaid(p => !p)}
              className={cn("px-3 py-2 rounded-xl text-sm font-medium border transition-colors",
                txIsPaid ? "bg-emerald-400/15 text-emerald-400 border-emerald-400/30" : "bg-white/[0.06] text-white/40 border-transparent")}>
              {txIsPaid ? "Pagado" : "Pendiente"}
            </button>
          </div>
          {/* Split — only personal expense */}
          {txScope === "personal" && txType === "expense" && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setShowSplit(p => !p); setTxPartnerShare(""); }}
                className={cn(
                  "w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm border transition-colors",
                  showSplit
                    ? "bg-violet-400/10 text-violet-300 border-violet-400/25"
                    : "bg-white/[0.06] text-white/40 border-transparent",
                )}
              >
                <HandCoins size={14} />
                Dividir con {partnerFirstName}
              </button>
              {showSplit && (
                <input
                  type="number" inputMode="decimal"
                  placeholder={`Monto de ${partnerFirstName}`}
                  value={txPartnerShare} onChange={e => setTxPartnerShare(e.target.value)}
                  className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                />
              )}
            </div>
          )}
          <button
            onClick={() => editFinance ? updateTx.mutate() : addTx.mutate()}
            disabled={!txTitle.trim() || !txAmount || addTx.isPending || updateTx.isPending}
            className="w-full py-3 bg-amber-400 text-black font-semibold rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
            {editFinance ? "Guardar" : "Agregar"}
          </button>
        </Overlay>
      )}

      {(showAddRec || editRec) && (
        <Overlay onClose={closeRecForm}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{editRec ? "Editar gasto fijo" : "Gasto fijo del hogar"}</h2>
            <button onClick={closeRecForm} className="text-white/40"><X size={20} /></button>
          </div>
          <input placeholder="Título (ej. Netflix, Renta)" value={recTitle} onChange={e => setRecTitle(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <input type="number" inputMode="decimal" placeholder="Monto mensual" value={recAmount} onChange={e => setRecAmount(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setRecCategory(recCategory === c ? "" : c)}
                className={cn("px-2.5 py-1 rounded-full text-[11px] transition-colors",
                  recCategory === c ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" : "bg-white/[0.06] text-white/40")}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/40 shrink-0">Día del mes:</span>
            <input type="number" min="1" max="28" value={recDay} onChange={e => setRecDay(e.target.value)}
              className="w-16 bg-white/[0.06] rounded-xl px-3 py-2 text-sm text-white outline-none text-center" />
          </div>
          {/* Who pays */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/30 pl-1">¿Quién paga?</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setRecPaidBy(userId)}
                className={cn(
                  "py-2 rounded-xl text-[12px] font-medium border transition-colors",
                  recPaidBy === userId
                    ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
                    : "bg-white/[0.06] text-white/40 border-transparent",
                )}
              >
                {myFirstName}
              </button>
              <button
                onClick={() => { if (partner) setRecPaidBy(partner.id); }}
                disabled={!partner}
                className={cn(
                  "py-2 rounded-xl text-[12px] font-medium border transition-colors disabled:opacity-30",
                  partner && recPaidBy === partner.id
                    ? "bg-violet-400/15 text-violet-400 border-violet-400/30"
                    : "bg-white/[0.06] text-white/40 border-transparent",
                )}
              >
                {partnerFirstName}
              </button>
              <button
                onClick={() => setRecPaidBy(null)}
                className={cn(
                  "py-2 rounded-xl text-[12px] font-medium border transition-colors",
                  recPaidBy === null
                    ? "bg-white/10 text-white/60 border-white/20"
                    : "bg-white/[0.06] text-white/40 border-transparent",
                )}
              >
                Sin asignar
              </button>
            </div>
          </div>
          <button
            onClick={() => editRec ? updateRec.mutate() : addRec.mutate()}
            disabled={!recTitle.trim() || !recAmount || addRec.isPending || updateRec.isPending}
            className="w-full py-3 bg-amber-400 text-black font-semibold rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
            {editRec ? "Guardar" : "Agregar"}
          </button>
        </Overlay>
      )}

      {(showAddGoal || editGoal) && (
        <Overlay onClose={closeGoalForm}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{editGoal ? "Editar meta" : "Nueva meta"}</h2>
            <button onClick={closeGoalForm} className="text-white/40"><X size={20} /></button>
          </div>
          <input placeholder="Título (ej. Viaje a Europa)" value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <input type="number" inputMode="decimal" placeholder="Meta total" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <input type="number" inputMode="decimal" placeholder="Ya ahorrado (opcional)" value={goalCurrent} onChange={e => setGoalCurrent(e.target.value)}
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-white/30 pl-1">Fecha límite (opcional)</span>
            <input type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/60 outline-none" />
          </div>
          <button
            onClick={() => editGoal ? updateGoal.mutate() : addGoal.mutate()}
            disabled={!goalTitle.trim() || !goalTarget || addGoal.isPending || updateGoal.isPending}
            className="w-full py-3 bg-amber-400 text-black font-semibold rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
            {editGoal ? "Guardar" : "Crear meta"}
          </button>
        </Overlay>
      )}

      {depositGoal && (
        <Overlay onClose={() => setDepositGoal(null)}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{depositGoal.title}</h2>
            <button onClick={() => setDepositGoal(null)} className="text-white/40"><X size={20} /></button>
          </div>
          <p className="text-sm text-white/40">
            {fmtCurrency(depositGoal.current_amount ?? 0)} de {fmtCurrency(depositGoal.target_amount)} ahorrados
          </p>
          <input
            type="number" inputMode="decimal" placeholder="¿Cuánto vas a abonar?"
            value={depositAmount} onChange={e => setDepositAmount(e.target.value)} autoFocus
            className="w-full bg-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none"
          />
          <button
            onClick={() => depositToGoal.mutate()}
            disabled={!depositAmount || depositToGoal.isPending}
            className="w-full py-3 bg-amber-400 text-black font-semibold rounded-xl text-sm disabled:opacity-40 active:scale-[0.98] transition-transform">
            Abonar
          </button>
        </Overlay>
      )}
    </div>
  );
}
