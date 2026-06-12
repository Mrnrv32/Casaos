export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      activity_log: {
        Row: { actor_id: string | null; created_at: string | null; entity_id: string | null; entity_type: string; home_id: string; id: string; metadata: Json | null; summary: string; verb: string }
        Insert: { actor_id?: string | null; created_at?: string | null; entity_id?: string | null; entity_type: string; home_id: string; id?: string; metadata?: Json | null; summary: string; verb: string }
        Update: { actor_id?: string | null; created_at?: string | null; entity_id?: string | null; entity_type?: string; home_id?: string; id?: string; metadata?: Json | null; summary?: string; verb?: string }
        Relationships: [{ foreignKeyName: "activity_log_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "activity_log_home_id_fkey"; columns: ["home_id"]; isOneToOne: false; referencedRelation: "homes"; referencedColumns: ["id"] }]
      }
      attachments: {
        Row: { created_at: string | null; entity_id: string; entity_type: string; file_name: string | null; home_id: string; id: string; kind: string; mime_type: string | null; size_bytes: number | null; storage_path: string; uploaded_by: string | null }
        Insert: { created_at?: string | null; entity_id: string; entity_type: string; file_name?: string | null; home_id: string; id?: string; kind?: string; mime_type?: string | null; size_bytes?: number | null; storage_path: string; uploaded_by?: string | null }
        Update: { created_at?: string | null; entity_id?: string; entity_type?: string; file_name?: string | null; home_id?: string; id?: string; kind?: string; mime_type?: string | null; size_bytes?: number | null; storage_path?: string; uploaded_by?: string | null }
        Relationships: []
      }
      board_cards: {
        Row: { content: string; created_at: string | null; created_by: string | null; home_id: string; id: string; source: string | null; source_id: string | null; source_url: string | null; status: string | null; updated_at: string | null }
        Insert: { content: string; created_at?: string | null; created_by?: string | null; home_id: string; id?: string; source?: string | null; source_id?: string | null; source_url?: string | null; status?: string | null; updated_at?: string | null }
        Update: { content?: string; created_at?: string | null; created_by?: string | null; home_id?: string; id?: string; source?: string | null; source_id?: string | null; source_url?: string | null; status?: string | null; updated_at?: string | null }
        Relationships: [{ foreignKeyName: "board_cards_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "board_cards_home_id_fkey"; columns: ["home_id"]; isOneToOne: false; referencedRelation: "homes"; referencedColumns: ["id"] }]
      }
      calendar_events: {
        Row: { created_at: string | null; created_by: string | null; description: string | null; end_at: string | null; home_id: string; id: string; is_all_day: boolean | null; link_url: string | null; moment_id: string | null; start_at: string; tag: string | null; title: string; updated_at: string | null }
        Insert: { created_at?: string | null; created_by?: string | null; description?: string | null; end_at?: string | null; home_id: string; id?: string; is_all_day?: boolean | null; link_url?: string | null; moment_id?: string | null; start_at: string; tag?: string | null; title: string; updated_at?: string | null }
        Update: { created_at?: string | null; created_by?: string | null; description?: string | null; end_at?: string | null; home_id?: string; id?: string; is_all_day?: boolean | null; link_url?: string | null; moment_id?: string | null; start_at?: string; tag?: string | null; title?: string; updated_at?: string | null }
        Relationships: [{ foreignKeyName: "calendar_events_home_id_fkey"; columns: ["home_id"]; isOneToOne: false; referencedRelation: "homes"; referencedColumns: ["id"] }, { foreignKeyName: "calendar_events_moment_id_fkey"; columns: ["moment_id"]; isOneToOne: false; referencedRelation: "couple_moments"; referencedColumns: ["id"] }]
      }
      chat_messages: {
        Row: { created_at: string | null; home_id: string; id: string; is_sticky: boolean | null; message: string; profile_id: string | null; sticky_expires_at: string | null }
        Insert: { created_at?: string | null; home_id: string; id?: string; is_sticky?: boolean | null; message: string; profile_id?: string | null; sticky_expires_at?: string | null }
        Update: { created_at?: string | null; home_id?: string; id?: string; is_sticky?: boolean | null; message?: string; profile_id?: string | null; sticky_expires_at?: string | null }
        Relationships: []
      }
      chore_completions: {
        Row: { chore_id: string; completed_at: string | null; completed_by: string | null; home_id: string; id: string }
        Insert: { chore_id: string; completed_at?: string | null; completed_by?: string | null; home_id: string; id?: string }
        Update: { chore_id?: string; completed_at?: string | null; completed_by?: string | null; home_id?: string; id?: string }
        Relationships: [{ foreignKeyName: "chore_completions_chore_id_fkey"; columns: ["chore_id"]; isOneToOne: false; referencedRelation: "chores"; referencedColumns: ["id"] }]
      }
      chores: {
        Row: { assigned_to: string | null; created_at: string | null; created_by: string | null; home_id: string; id: string; is_active: boolean | null; recurrence: string | null; title: string; updated_at: string | null }
        Insert: { assigned_to?: string | null; created_at?: string | null; created_by?: string | null; home_id: string; id?: string; is_active?: boolean | null; recurrence?: string | null; title: string; updated_at?: string | null }
        Update: { assigned_to?: string | null; created_at?: string | null; created_by?: string | null; home_id?: string; id?: string; is_active?: boolean | null; recurrence?: string | null; title?: string; updated_at?: string | null }
        Relationships: []
      }
      couple_moments: {
        Row: { category: string | null; created_at: string | null; created_by: string | null; description: string | null; external_url: string | null; map_url: string | null; home_id: string; id: string; status: string | null; target_date: string | null; title: string; updated_at: string | null }
        Insert: { category?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; external_url?: string | null; map_url?: string | null; home_id: string; id?: string; status?: string | null; target_date?: string | null; title: string; updated_at?: string | null }
        Update: { category?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; external_url?: string | null; map_url?: string | null; home_id?: string; id?: string; status?: string | null; target_date?: string | null; title?: string; updated_at?: string | null }
        Relationships: []
      }
      finances: {
        Row: { amount: number; category: string | null; created_at: string | null; created_by: string | null; deleted_at: string | null; due_date: string | null; home_id: string; id: string; is_paid: boolean | null; partner_share: number | null; recurring_expense_id: string | null; scope: string; split_settled: boolean | null; title: string; type: string; updated_at: string | null }
        Insert: { amount: number; category?: string | null; created_at?: string | null; created_by?: string | null; deleted_at?: string | null; due_date?: string | null; home_id: string; id?: string; is_paid?: boolean | null; partner_share?: number | null; recurring_expense_id?: string | null; scope?: string; split_settled?: boolean | null; title: string; type: string; updated_at?: string | null }
        Update: { amount?: number; category?: string | null; created_at?: string | null; created_by?: string | null; deleted_at?: string | null; due_date?: string | null; home_id?: string; id?: string; is_paid?: boolean | null; partner_share?: number | null; recurring_expense_id?: string | null; scope?: string; split_settled?: boolean | null; title?: string; type?: string; updated_at?: string | null }
        Relationships: []
      }
      home_invitations: {
        Row: { created_at: string | null; expires_at: string | null; home_id: string; id: string; invited_email: string; status: string | null; token: string }
        Insert: { created_at?: string | null; expires_at?: string | null; home_id: string; id?: string; invited_email: string; status?: string | null; token?: string }
        Update: { created_at?: string | null; expires_at?: string | null; home_id?: string; id?: string; invited_email?: string; status?: string | null; token?: string }
        Relationships: []
      }
      homes: {
        Row: { created_at: string | null; id: string; name: string }
        Insert: { created_at?: string | null; id?: string; name: string }
        Update: { created_at?: string | null; id?: string; name?: string }
        Relationships: []
      }
      meal_plan: {
        Row: { created_at: string | null; created_by: string | null; custom_title: string | null; day_of_week: number; home_id: string; id: string; recipe_id: string | null; week_start: string }
        Insert: { created_at?: string | null; created_by?: string | null; custom_title?: string | null; day_of_week: number; home_id: string; id?: string; recipe_id?: string | null; week_start: string }
        Update: { created_at?: string | null; created_by?: string | null; custom_title?: string | null; day_of_week?: number; home_id?: string; id?: string; recipe_id?: string | null; week_start?: string }
        Relationships: []
      }
      notifications: {
        Row: { body: string | null; created_at: string | null; data: Json | null; entity_id: string | null; entity_type: string | null; home_id: string; id: string; kind: string; link: string | null; priority: number | null; read_at: string | null; recipient_id: string | null; title: string }
        Insert: { body?: string | null; created_at?: string | null; data?: Json | null; entity_id?: string | null; entity_type?: string | null; home_id: string; id?: string; kind: string; link?: string | null; priority?: number | null; read_at?: string | null; recipient_id?: string | null; title: string }
        Update: { body?: string | null; created_at?: string | null; data?: Json | null; entity_id?: string | null; entity_type?: string | null; home_id?: string; id?: string; kind?: string; link?: string | null; priority?: number | null; read_at?: string | null; recipient_id?: string | null; title?: string }
        Relationships: []
      }
      pantry: {
        Row: { added_by: string | null; category: string | null; deleted_at: string | null; home_id: string; id: string; is_bought: boolean | null; item_name: string; quantity: number | null; updated_at: string | null }
        Insert: { added_by?: string | null; category?: string | null; deleted_at?: string | null; home_id: string; id?: string; is_bought?: boolean | null; item_name: string; quantity?: number | null; updated_at?: string | null }
        Update: { added_by?: string | null; category?: string | null; deleted_at?: string | null; home_id?: string; id?: string; is_bought?: boolean | null; item_name?: string; quantity?: number | null; updated_at?: string | null }
        Relationships: []
      }
      profiles: {
        Row: { avatar_url: string | null; full_name: string; home_id: string | null; id: string; last_read_at: string | null; push_token: string | null; role: string | null; updated_at: string | null }
        Insert: { avatar_url?: string | null; full_name: string; home_id?: string | null; id: string; last_read_at?: string | null; push_token?: string | null; role?: string | null; updated_at?: string | null }
        Update: { avatar_url?: string | null; full_name?: string; home_id?: string | null; id?: string; last_read_at?: string | null; push_token?: string | null; role?: string | null; updated_at?: string | null }
        Relationships: []
      }
      project_milestones: {
        Row: { cost: number | null; created_at: string | null; description: string | null; home_id: string; id: string; is_done: boolean | null; project_id: string; title: string; updated_at: string | null }
        Insert: { cost?: number | null; created_at?: string | null; description?: string | null; home_id: string; id?: string; is_done?: boolean | null; project_id: string; title: string; updated_at?: string | null }
        Update: { cost?: number | null; created_at?: string | null; description?: string | null; home_id?: string; id?: string; is_done?: boolean | null; project_id?: string; title?: string; updated_at?: string | null }
        Relationships: []
      }
      projects: {
        Row: { created_at: string | null; created_by: string | null; description: string | null; home_id: string; id: string; status: string | null; title: string; total_budget: number | null; updated_at: string | null }
        Insert: { created_at?: string | null; created_by?: string | null; description?: string | null; home_id: string; id?: string; status?: string | null; title: string; total_budget?: number | null; updated_at?: string | null }
        Update: { created_at?: string | null; created_by?: string | null; description?: string | null; home_id?: string; id?: string; status?: string | null; title?: string; total_budget?: number | null; updated_at?: string | null }
        Relationships: []
      }
      push_subscriptions: {
        Row: { auth: string; created_at: string | null; endpoint: string; home_id: string; id: string; p256dh: string; user_agent: string | null; user_id: string }
        Insert: { auth: string; created_at?: string | null; endpoint: string; home_id: string; id?: string; p256dh: string; user_agent?: string | null; user_id: string }
        Update: { auth?: string; created_at?: string | null; endpoint?: string; home_id?: string; id?: string; p256dh?: string; user_agent?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "push_subscriptions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "push_subscriptions_home_id_fkey"; columns: ["home_id"]; isOneToOne: false; referencedRelation: "homes"; referencedColumns: ["id"] }]
      }
      recipes: {
        Row: { category: string | null; created_at: string | null; created_by: string | null; description: string | null; home_id: string; id: string; ingredients: Json | null; title: string; updated_at: string | null }
        Insert: { category?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; home_id: string; id?: string; ingredients?: Json | null; title: string; updated_at?: string | null }
        Update: { category?: string | null; created_at?: string | null; created_by?: string | null; description?: string | null; home_id?: string; id?: string; ingredients?: Json | null; title?: string; updated_at?: string | null }
        Relationships: []
      }
      recurring_expenses: {
        Row: { amount: number; category: string | null; created_at: string | null; created_by: string | null; home_id: string; id: string; is_active: boolean | null; paid_by: string | null; recurrence_day: number | null; title: string }
        Insert: { amount: number; category?: string | null; created_at?: string | null; created_by?: string | null; home_id: string; id?: string; is_active?: boolean | null; paid_by?: string | null; recurrence_day?: number | null; title: string }
        Update: { amount?: number; category?: string | null; created_at?: string | null; created_by?: string | null; home_id?: string; id?: string; is_active?: boolean | null; paid_by?: string | null; recurrence_day?: number | null; title?: string }
        Relationships: []
      }
      savings_goals: {
        Row: { created_at: string | null; created_by: string | null; current_amount: number | null; deadline: string | null; home_id: string; id: string; moment_id: string | null; project_id: string | null; target_amount: number; title: string; updated_at: string | null }
        Insert: { created_at?: string | null; created_by?: string | null; current_amount?: number | null; deadline?: string | null; home_id: string; id?: string; moment_id?: string | null; project_id?: string | null; target_amount: number; title: string; updated_at?: string | null }
        Update: { created_at?: string | null; created_by?: string | null; current_amount?: number | null; deadline?: string | null; home_id?: string; id?: string; moment_id?: string | null; project_id?: string | null; target_amount?: number; title?: string; updated_at?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      create_home: { Args: { p_name: string }; Returns: string }
      get_home_attention: { Args: never; Returns: { due_at: string; kind: string; link: string; priority: number; subtitle: string; title: string }[] }
      get_invitation_by_token: { Args: { p_token: string }; Returns: { expires_at: string; home_id: string; home_name: string; id: string; status: string }[] }
      get_my_home_id: { Args: never; Returns: string }
      get_my_pending_invite_token: { Args: never; Returns: string }
      notify_partner: { Args: { p_body?: string; p_data?: Json; p_entity_id?: string; p_entity_type?: string; p_kind: string; p_link?: string; p_title: string }; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]

// ─── Convenience row types ─────────────────────────────────────────────────────
export type Profile          = Tables<"profiles">
export type Home             = Tables<"homes">
export type HomeInvitation   = Tables<"home_invitations">
export type PantryItem       = Tables<"pantry">
export type Finance          = Tables<"finances">
export type RecurringExpense = Tables<"recurring_expenses">
export type ChatMessage      = Tables<"chat_messages">
export type CoupleMoment     = Tables<"couple_moments">
export type CalendarEvent    = Tables<"calendar_events">
export type Chore            = Tables<"chores">
export type ChoreCompletion  = Tables<"chore_completions">
export type Recipe           = Tables<"recipes">
export type MealPlanEntry    = Tables<"meal_plan">
export type Project          = Tables<"projects">
export type ProjectMilestone = Tables<"project_milestones">
export type SavingsGoal      = Tables<"savings_goals">
export type ActivityLog      = Tables<"activity_log">
export type Notification     = Tables<"notifications">
export type Attachment       = Tables<"attachments">
export type BoardCard        = Tables<"board_cards">

// ─── Narrowed literals ─────────────────────────────────────────────────────────
export type ProjectStatus    = "planning" | "in_progress" | "done"
export type MomentStatus     = "pending" | "scheduled" | "completed"
export type FinanceType      = "income" | "expense"
export type CalendarTag      = "Medical" | "Social" | "Bills" | "Maintenance" | "Momento"
export type ChoreRecurrence  = "daily" | "weekly" | "biweekly" | "monthly" | "once"
export type Ingredient       = { name: string; quantity: string }
