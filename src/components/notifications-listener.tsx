"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useHome } from "@/providers/home-provider";
import type { Notification } from "@/types/supabase";

export function NotificationsListener() {
  const { userId } = useHome();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications:${userId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          toast(n.title, {
            description: n.body ?? undefined,
            action: n.link
              ? { label: "Ver", onClick: () => router.push(n.link!) }
              : undefined,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabase, queryClient]);

  return null;
}
