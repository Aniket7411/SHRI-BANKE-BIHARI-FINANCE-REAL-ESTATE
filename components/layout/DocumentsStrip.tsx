"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ExternalLink, FileText, Image as ImageIcon, Link2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocumentKind, SiteDocument } from "@/lib/types";
import { ease } from "@/components/ui/Reveal";

const KIND: Record<DocumentKind, { icon: typeof FileText; action: string }> = {
  pdf: { icon: FileText, action: "View PDF" },
  image: { icon: ImageIcon, action: "View" },
  link: { icon: Link2, action: "Open link" },
};

/**
 * "Our Certifications & Documents" — RERA, GST, registrations and bank partner letters.
 * PDFs and links open in a new tab, images in a lightbox. Renders nothing without documents.
 */
export function DocumentsStrip({ documents }: { documents: SiteDocument[] }) {
  const [preview, setPreview] = useState<SiteDocument | null>(null);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [preview]);

  if (!documents.length) return null;

  return (
    <section aria-labelledby="docs-title" className="border-t border-line bg-subtle">
      <div className="container-app py-10 sm:py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.7, ease }}>
            <span className="eyebrow">
              <ShieldCheck className="size-3.5" /> Trust &amp; compliance
            </span>
            <h2 id="docs-title" className="mt-3 text-[clamp(1.5rem,3vw,2.1rem)] leading-tight text-ink">
              Our Certifications &amp; Documents
            </h2>
          </motion.div>
          <p className="max-w-sm text-sm text-ink-soft">Registered, verified and partnered with leading banks. Tap any document to view it.</p>
        </div>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4"
        >
          {documents.map((d) => {
            const { icon: Icon, action } = KIND[d.fileKind] ?? KIND.link;
            const inner = (
              <>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong transition group-hover:bg-accent group-hover:text-accent-fg">
                  {d.fileKind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.fileUrl} alt="" loading="lazy" className="size-full rounded-2xl object-cover" />
                  ) : (
                    <Icon className="size-5" strokeWidth={1.6} />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[10.5px] font-semibold tracking-[0.14em] text-accent uppercase">{d.category}</span>
                  <span className="mt-0.5 line-clamp-2 block text-sm font-medium text-ink">{d.title}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-ink-soft group-hover:text-accent">
                    {action}
                    {d.fileKind === "image" ? <ArrowUpRight className="size-3" /> : <ExternalLink className="size-3" />}
                  </span>
                </span>
              </>
            );
            const cls =
              "group flex h-full w-full items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-soft";
            return (
              <motion.li
                key={d.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } } }}
                className="w-[78%] shrink-0 snap-start sm:w-auto"
              >
                {d.fileKind === "image" ? (
                  <button type="button" onClick={() => setPreview(d)} className={cls} aria-label={`View ${d.title}`}>
                    {inner}
                  </button>
                ) : (
                  <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-[95] flex flex-col bg-black/85 p-3 backdrop-blur-sm sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            role="dialog"
            aria-modal="true"
            aria-label={preview.title}
          >
            <div className="flex items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="text-[10.5px] font-semibold tracking-[0.14em] text-white/60 uppercase">{preview.category}</p>
                <p className="truncate text-sm font-medium">{preview.title}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={preview.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-medium hover:bg-white/20"
                >
                  <ExternalLink className="size-3.5" /> <span className="hidden sm:inline">Open original</span>
                </a>
                <button type="button" autoFocus onClick={() => setPreview(null)} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mt-3 flex min-h-0 flex-1 items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.fileUrl} alt={preview.title} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-xl bg-white object-contain shadow-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
