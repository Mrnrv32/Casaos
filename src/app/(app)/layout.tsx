import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HomeProvider } from "@/providers/home-provider";
import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, home_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.home_id) {
    const { data: token } = await supabase.rpc("get_my_pending_invite_token");
    if (token) redirect(`/invite/${token}`);
    redirect("/onboarding");
  }

  const { data: home } = await supabase
    .from("homes")
    .select("name")
    .eq("id", profile.home_id)
    .single();

  return (
    <HomeProvider
      homeId={profile.home_id}
      userId={user.id}
      userEmail={user.email ?? ""}
      initialFullName={profile.full_name}
      avatarUrl={profile.avatar_url ?? null}
      homeName={home?.name ?? ""}
    >
      <div
        className="flex flex-col bg-[#0f0f0f]"
        style={{ height: "100dvh", maxWidth: "440px", margin: "0 auto" }}
      >
        <main className="flex-1 overflow-y-auto overscroll-none">{children}</main>
        <BottomNav />
      </div>
    </HomeProvider>
  );
}
