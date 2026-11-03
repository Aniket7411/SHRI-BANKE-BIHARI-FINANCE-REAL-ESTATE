import { LoaderCircle } from "lucide-react";

/** Instant placeholder while an admin page loads its signed-in data (every page is request-time). */
export default function AdminLoading() {
  return (
    <div className="grid min-h-[60dvh] flex-1 place-items-center">
      <LoaderCircle className="size-6 animate-spin text-ink-soft" />
    </div>
  );
}
