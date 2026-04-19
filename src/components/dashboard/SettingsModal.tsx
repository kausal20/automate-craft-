"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Camera } from "lucide-react";
import type { AuthenticatedUser } from "@/lib/automation";

export function SettingsModal({
  isOpen,
  onClose,
  user,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
}) {
  const [activeTab, setActiveTab] = useState<"account">("account");

  // Account State
  const [name, setName] = useState(user.name || "AutomateCraft user");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  const saveName = () => {
    if (tempName.trim()) {
      setName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative flex w-full max-w-[1100px] h-full max-h-[85vh] flex-col md:flex-row overflow-hidden rounded-3xl bg-[#111111] shadow-[0_24px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
          >
            {/* Sidebar */}
            <div className="w-full md:w-[260px] md:h-full flex-shrink-0 bg-[#0a0a0a] border-b md:border-b-0 md:border-r border-white/5 p-6 space-y-6 overflow-y-auto">
               <div className="mb-2">
                 <h2 className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-4 px-3">
                   Settings
                 </h2>
                 <nav className="space-y-1">
                   <button
                     onClick={() => setActiveTab("account")}
                     className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                       activeTab === "account" 
                         ? "bg-[#252525] text-white shadow-sm ring-1 ring-white/10" 
                         : "text-white/60 hover:bg-white/5 hover:text-white"
                     }`}
                   >
                     Account Settings
                   </button>
                 </nav>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto relative bg-[#111111]">
               {/* Fixed Header */}
               <div className="sticky top-0 z-10 flex items-center justify-between bg-[#111111]/90 backdrop-blur-md px-8 py-6 border-b border-white/5 shadow-sm">
                 <h2 className="text-xl font-bold text-white">
                   Account Settings
                 </h2>
                 <button
                   title="Close settings"
                   onClick={onClose}
                   className="rounded-full p-2 bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
                 >
                   <X className="h-5 w-5" />
                 </button>
               </div>

               {/* Tab Content */}
               <div className="p-8">
                 {activeTab === "account" && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="space-y-10 max-w-2xl"
                   >
                      {/* Email Section */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-8">
                        <div>
                          <h4 className="font-bold text-white text-[15px]">Email</h4>
                          <p className="text-[13px] text-white/50 mt-1">
                            The email address linked to your current account.
                          </p>
                        </div>
                        <div className="text-[14px] text-white/70 font-medium bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                          {user.email}
                        </div>
                      </div>

                      {/* Profile Picture Section */}
                      <div className="flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-4 border-b border-white/5 pb-8">
                        <div>
                          <h4 className="font-bold text-white text-[15px]">Profile picture</h4>
                          <p className="text-[13px] text-white/50 mt-1">
                            This image will be displayed publicly on your profile.
                          </p>
                        </div>
                        <div>
                          <div 
                            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#1A1A1A] ring-1 ring-white/10 overflow-hidden cursor-pointer group shadow-lg"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-2xl font-bold text-white/80 uppercase">
                                {name[0] || user.email[0]}
                              </span>
                            )}
                            
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Camera className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <input 
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Name Section */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8">
                        <div className="max-w-[280px]">
                          <h4 className="font-bold text-white text-[15px]">Name</h4>
                          <p className="text-[13px] text-white/50 mt-1">
                            Your full name, exactly as displayed across the platform.
                          </p>
                        </div>
                        <div className="flex-1 sm:max-w-[240px] flex justify-end">
                          {isEditingName ? (
                            <div className="flex items-center gap-2 w-full">
                              <input 
                                type="text"
                                autoFocus
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="w-full bg-[#1A1A1A] text-white border border-[#3B82F6] rounded-xl px-4 py-3 text-sm focus:outline-none shadow-[0_0_0_3px_rgba(59,130,246,0.2)]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveName();
                                  if (e.key === 'Escape') setIsEditingName(false);
                                }}
                              />
                              <button 
                                onClick={saveName}
                                className="px-4 py-3 rounded-xl bg-white text-black text-sm font-bold shadow-[0_4px_14px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-all"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setTempName(name);
                                setIsEditingName(true);
                              }}
                              className="flex items-center justify-between w-full sm:w-auto min-w-[200px] border border-white/10 bg-[#1A1A1A] rounded-xl px-4 py-3 text-sm text-white/90 font-medium hover:bg-white/5 transition-all group shadow-sm"
                            >
                              <span className="truncate pr-4">{name}</span>
                              <div className="p-1 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                                <Pencil className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 flex-shrink-0" />
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                   </motion.div>
                 )}

               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
