import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { Providers } from "@/components/providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Providers session={session}>
      <div className="flex min-h-screen">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </Providers>
  );
}
