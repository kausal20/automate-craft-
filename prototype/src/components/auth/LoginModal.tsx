"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import BrandMark from "@/components/BrandMark";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.94-1.79 3.05-4.42 3.05-7.59Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.89-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 13.74a5.98 5.98 0 0 1 0-3.48V7.62H2.89a10 10 0 0 0 0 8.76l3.41-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.03c1.49 0 2.83.51 3.88 1.52l2.9-2.9C17.06 3.03 14.75 2 12 2A10 10 0 0 0 2.89 7.62L6.3 10.26c.81-2.41 3.05-4.23 5.7-4.23Z"
        fill="#EA4335"
      />
    </svg>
  );
}

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  nextUrl?: string; // Optional url to return to after auth
};

export function LoginModal({ isOpen, onClose, nextUrl }: LoginModalProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const targetNextUrl = nextUrl || pathname || '/';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[420px] rounded-[1.5rem] bg-[#121212] p-8 shadow-[0_24px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 mx-4 animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-8">
          <div className="mb-6">
            <BrandMark compact showName={true} />
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Log in to your account</h2>
          <p className="mt-2 text-sm text-foreground/50">Start building automations and managing workflows.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => window.location.href = `/api/auth/oauth?provider=google&next=${encodeURIComponent(targetNextUrl)}`}
            className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-[14px] font-semibold text-white hover:bg-white/10 shadow-sm transition-all"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          
          <div className="flex items-center gap-4 py-2">
             <div className="flex-1 h-px bg-white/5" />
             <span className="text-xs font-semibold uppercase tracking-wider text-white/40">OR</span>
             <div className="flex-1 h-px bg-white/5" />
          </div>

          <button 
            onClick={() => window.location.href = `/login?next=${encodeURIComponent(targetNextUrl)}`}
            className="flex w-full items-center justify-center rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold text-black shadow-[0_6px_18px_rgba(255,255,255,0.1)] transition-all hover:bg-white/90 hover:scale-[1.01]"
          >
            Continue with email
          </button>
        </div>
      </div>
    </div>
  );
}
