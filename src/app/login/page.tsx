import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard/campaigns");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <LoginForm />
    </div>
  );
}
