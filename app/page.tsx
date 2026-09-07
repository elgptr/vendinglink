import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    redirect("/customer");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/inventory");
  }

  redirect("/agent/catalog");
}

