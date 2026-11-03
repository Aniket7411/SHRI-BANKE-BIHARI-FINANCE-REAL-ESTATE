import { Suspense } from "react";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { PreviewPill } from "@/components/site/PreviewPill";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteChrome>{children}</SiteChrome>
      <Suspense fallback={null}>
        <PreviewPill />
      </Suspense>
    </>
  );
}
