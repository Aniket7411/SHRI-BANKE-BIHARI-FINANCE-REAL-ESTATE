"use client";

import { AnimatePresence, motion } from "motion/react";
import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon, LogoMark } from "@/components/ui/BrandIcons";
import { useSite } from "@/components/layout/SiteProvider";

const quickReplies = [
  "I want a Home Loan",
  "I need a Vehicle Loan",
  "Looking to buy property",
  "I want to sell my property",
];

/** Floating WhatsApp chat — opens a chat-style card, then hands off to WhatsApp. */
export function WhatsAppWidget() {
  const s = useSite();
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(true);
  const [text, setText] = useState("");
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTyping(true);
    setNudge(false);
    const t = setTimeout(() => setTyping(false), 1100);
    return () => clearTimeout(t);
  }, [open]);

  const send = (msg: string) => {
    window.open(whatsappLink(s, msg || "Hi! I'd like to know more about your services."), "_blank", "noopener");
    setText("");
  };

  return (
    <div className="fixed right-4 bottom-[84px] z-[60] flex flex-col items-end gap-3 md:right-6 md:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-[calc(100vw-2rem)] max-w-[360px] origin-bottom-right overflow-hidden rounded-3xl border border-line bg-surface shadow-soft"
          >
            <div className="flex items-center gap-3 bg-[#075e54] p-4 text-white">
              <div className="relative">
                <LogoMark className="size-10" />
                <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#075e54] bg-wa" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{site.name}</p>
                <p className="text-xs text-white/75">Typically replies in a few minutes</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1.5 hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 bg-subtle p-4">
              <div className="min-h-[72px]">
                {typing ? (
                  <div className="inline-flex gap-1 rounded-2xl rounded-tl-sm bg-surface px-4 py-3 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-ink-soft"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface px-4 py-3 text-sm text-ink shadow-sm"
                  >
                    Namaste 🙏 Welcome to {site.name}! How can we help you today?
                    <span className="mt-1 block text-right text-[10px] text-ink-soft">now</span>
                  </motion.div>
                )}
              </div>
              {!typing && (
                <motion.div
                  initial="h"
                  animate="s"
                  variants={{ s: { transition: { staggerChildren: 0.06 } } }}
                  className="flex flex-wrap gap-2"
                >
                  {quickReplies.map((q) => (
                    <motion.button
                      key={q}
                      variants={{ h: { opacity: 0, y: 6 }, s: { opacity: 1, y: 0 } }}
                      onClick={() => send(q)}
                      className="rounded-full border border-[#075e54]/30 bg-surface px-3 py-1.5 text-xs text-ink transition hover:border-wa hover:bg-wa/10"
                    >
                      {q}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
              className="flex items-center gap-2 border-t border-line p-3"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                aria-label="Message"
                className="min-w-0 flex-1 rounded-full bg-subtle px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
              />
              <button aria-label="Send on WhatsApp" className="grid size-10 place-items-center rounded-full bg-wa text-white">
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <AnimatePresence>
          {nudge && !open && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={() => setOpen(true)}
              className="hidden rounded-full border border-line bg-surface px-4 py-2 text-[13px] text-ink shadow-soft sm:block"
            >
              Need help with a loan? 💬
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setOpen((o) => !o)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          aria-label={open ? "Close WhatsApp chat" : "Chat on WhatsApp"}
          className="relative grid size-14 place-items-center rounded-full bg-wa text-white shadow-[0_10px_30px_-6px_rgba(37,211,102,0.6)]"
        >
          {!open && <span className="absolute inset-0 animate-ping-slow rounded-full bg-wa/50" />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "x" : "wa"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              {open ? <X className="size-6" /> : <WhatsAppIcon className="size-7" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
