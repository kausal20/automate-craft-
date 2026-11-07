"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DeleteAccountSection() {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
      });

      if (res.ok) {
        // Redirection to home immediately logging out
        window.location.href = "/";
      } else {
        // Log out or handle failure visually
        setIsDeleting(false);
        setShowModal(false);
      }
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <section className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-50/50 p-6 dark:bg-red-950/10">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-red-700 dark:text-red-500">
              Danger Zone
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-red-900/60 dark:text-red-200/60">
              Permanently delete your account. This action is irreversible. All your automations, webhook pathways, connected integrations, and remaining credits will be permanently destroyed.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(220,38,38,0.25)] transition-all hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
              className="relative w-full max-w-md rounded-[1.5rem] bg-white p-8 shadow-[0_24px_50px_rgba(0,0,0,0.1)] ring-1 ring-black/5 mx-4"
            >
              <button 
                onClick={() => !isDeleting && setShowModal(false)}
                className="absolute right-5 top-5 rounded-full p-1.5 text-foreground/40 transition-colors hover:bg-black/5 hover:text-foreground"
                disabled={isDeleting}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-100/60 text-red-600">
                <Trash2 className="h-6 w-6" />
              </div>
              
              <h3 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-foreground">
                Delete your account
              </h3>
              
              <p className="text-[0.95rem] leading-relaxed text-foreground/60 mb-8">
                Are you completely sure? This action cannot be undone. This will permanently delete your account, instantly stop all active workflows, and you will lose any remaining credits.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-[14px] border border-black/10 bg-white py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-black/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-red-600 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 shadow-[0_4px_14px_rgba(220,38,38,0.25)]"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isDeleting ? "Deleting..." : "Yes, delete my account"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
