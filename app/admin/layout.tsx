import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/agent/catalog");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar username={session.user.name || "Admin"} />
      <main className="flex-1 md:ml-64 p-4 md:p-8">{children}</main>
    </div>
  );
}
