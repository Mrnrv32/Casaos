import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "./accept-invite-button";
import { Home } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase.rpc("get_invitation_by_token", {
    p_token: token,
  });
  const invite = rows?.[0] ?? null;

  if (!invite) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6 text-center">
        <p className="text-white/50 text-sm">Invitación no encontrada.</p>
      </div>
    );
  }

  if (invite.status === "expired") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6 text-center">
        <p className="text-white font-semibold mb-2">Invitación expirada</p>
        <p className="text-white/40 text-sm">
          Pide a tu pareja que genere un nuevo enlace desde Ajustes.
        </p>
      </div>
    );
  }

  if (invite.status === "accepted") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6 text-center">
        <p className="text-white font-semibold mb-2">Ya fue utilizada</p>
        <p className="text-white/40 text-sm">
          Esta invitación ya fue aceptada anteriormente.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0f0f0f] px-6">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/10 mb-4">
          <Home className="w-6 h-6 text-amber-400" />
        </div>
        <p className="text-sm text-white/40 mb-1">Tu pareja te invita a unirte a</p>
        <h1 className="text-2xl font-bold text-white">{invite.home_name}</h1>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <AcceptInviteButton token={token} isLoggedIn={!!user} />
      </div>
    </div>
  );
}
