"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { GlassNav } from "@/components/glass-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { ready, session, t } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) {
    return <div className="grid min-h-dvh place-items-center text-violet-200">{t("loading")}</div>;
  }

  return (
    <>
      <main className="mx-auto max-w-md px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</main>
      <GlassNav />
    </>
  );
}
