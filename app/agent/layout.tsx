import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AgentSidebar from "@/components/agent/AgentSidebar";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <AgentSidebar username={session.user.name || "Agen"} />
      <main className="flex-1 md:ml-64 p-4 md:p-8">{children}</main>
    </div>
  );
}
