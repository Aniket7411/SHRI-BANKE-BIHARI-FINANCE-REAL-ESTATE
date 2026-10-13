import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { requireStaff } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}

async function Panel({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();
  return (
    <AdminShell staff={staff}>
      <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
    </AdminShell>
  );
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-[60dvh] flex-1 place-items-center">
      <LoaderCircle className="size-6 animate-spin text-ink-soft" />
    </div>
  );
}
