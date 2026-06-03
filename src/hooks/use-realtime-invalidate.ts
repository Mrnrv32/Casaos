"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type PostgresEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

interface RealtimeInvalidateOptions {
  channel: string;
  filter: string | undefined | null;
  queryKey: QueryKey;
  tables: string[];
  filterColumn?: string;
  event?: PostgresEvent;
}

export function useRealtimeInvalidate({
  channel,
  filter,
  queryKey,
  tables,
  filterColumn = "home_id",
  event = "*",
}: RealtimeInvalidateOptions) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const queryKeyStr = JSON.stringify(queryKey);
  const tablesStr = tables.join(",");

  useEffect(() => {
    if (!filter) return;
    const ch = supabase.channel(`${channel}:${filter}:${crypto.randomUUID()}`);
    for (const table of tables) {
      ch.on(
        "postgres_changes",
        { event, schema: "public", table, filter: `${filterColumn}=eq.${filter}` },
        () => queryClient.invalidateQueries({ queryKey })
      );
    }
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, filter, filterColumn, event, queryKeyStr, tablesStr, supabase, queryClient]);
}
