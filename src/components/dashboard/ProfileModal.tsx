"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Check, Loader2 } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/automation";

export const DISPLAY_NAME_KEY = "ac_display_name";
export const AVATAR_URL_KEY = "ac_avatar_url";

export function ProfileModal({
  isOpen,
  onClose,
  user,
  onNameChange,
  onAvatarChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
  onNameChange?: (name: string) => void;
  onAvatarChange?: (url: string) => void;
}) {
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DISPLAY_NAME_KEY) || user.name || "";
    }
    return user.name || "";
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AVATAR_URL_KEY);
    }
    return null;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    localStorage.setItem(AVATAR_URL_KEY, url);
    onAvatarChange?.(url);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const trimmed = name.trim();
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
    // Dispatch storage event so same-tab listeners (DashboardHomeClient) update immediately
    window.dispatchEvent(new StorageEvent("storage", { key: DISPLAY_NAME_KEY, newValue: trimmed }));
    onNameChange?.(trimmed);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const initials = (name || user.email).slice(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111113] shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <p className="text-[15px] font-semibold text-white">Edit Profile</p>
              <button onClick={onClose} className="rounded-lg p-1.5 text-white/30 hover:bg-white/[0.06] hover:text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/20 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-accent">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <div>
                  <p className="text-[13px] font-medium text-white/70">Profile photo</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 text-[12px] text-accent/70 hover:text-accent transition-colors"
                  >
                    Click to change →
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-white/25">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void handleSave(); }}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[14px] text-white placeholder:text-white/20 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-white/25">Email</label>
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-[14px] text-white/30">
                  {user.email}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full rounded-xl bg-accent py-3 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] hover:bg-[#5c95fb] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
                {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
