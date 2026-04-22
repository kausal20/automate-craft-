"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";

type AuthScreenProps = {
  mode: "login" | "signup";
  nextPath: string;
  initialError?: string | null;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
  focusSso?: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.94-1.79 3.05-4.42 3.05-7.59Z" fill="#4285F4" />
      <path d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.89-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.3 13.74a5.98 5.98 0 0 1 0-3.48V7.62H2.89a10 10 0 0 0 0 8.76l3.41-2.64Z" fill="#FBBC04" />
      <path d="M12 6.03c1.49 0 2.83.51 3.88 1.52l2.9-2.9C17.06 3.03 14.75 2 12 2A10 10 0 0 0 2.89 7.62L6.3 10.26c.81-2.41 3.05-4.23 5.7-4.23Z" fill="#EA4335" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* ─── Orbiting integration icon ─── */
function OrbitIcon({ children, delay, duration, startAngle, size = 42 }: {
  children: React.ReactNode; delay: number; duration: number; startAngle: number; size?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      className="absolute z-20"
      style={{
        left: "50%", top: "50%",
        marginLeft: -size / 2, marginTop: -size / 2,
        animation: `orbit-${Math.round(startAngle)} ${duration}s linear infinite`,
      }}
    >
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center justify-center rounded-2xl border border-white/[0.1] bg-[#0d1117]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]"
        style={{ width: size, height: size }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ─── 3D Feature card ─── */
function FeatureCard({ icon, title, desc, delay }: {
  icon: React.ReactNode; title: string; desc: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, rotateY: -3 }}
      className="w-[260px] rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 backdrop-blur-lg shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/15">
        {icon}
      </div>
      <h3 className="text-[0.82rem] font-semibold text-white/85 mb-1">{title}</h3>
      <p className="text-[0.7rem] leading-[1.6] text-white/30">{desc}</p>
    </motion.div>
  );
}

/* ─── Animated pulse dot ─── */
function PulseDot({ x, y, delay, color = "#3b82f6" }: { x: string; y: string; delay: number; color?: string }) {
  return (
    <motion.div
      className="absolute z-10"
      style={{ left: x, top: y }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 2, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <div className="absolute inset-0 h-2 w-2 rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.4 }} />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PANEL — Product showcase hero
   ═══════════════════════════════════════════ */
function HeroVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden" style={{ perspective: "1400px" }}>
      {/* Orbit keyframes */}
      <style>{`
        @keyframes orbit-0   { from { transform: rotate(0deg)   translateX(140px) rotate(0deg);   } to { transform: rotate(360deg) translateX(140px) rotate(-360deg); } }
        @keyframes orbit-72  { from { transform: rotate(72deg)  translateX(150px) rotate(-72deg);  } to { transform: rotate(432deg) translateX(150px) rotate(-432deg); } }
        @keyframes orbit-144 { from { transform: rotate(144deg) translateX(135px) rotate(-144deg); } to { transform: rotate(504deg) translateX(135px) rotate(-504deg); } }
        @keyframes orbit-216 { from { transform: rotate(216deg) translateX(145px) rotate(-216deg); } to { transform: rotate(576deg) translateX(145px) rotate(-576deg); } }
        @keyframes orbit-288 { from { transform: rotate(288deg) translateX(140px) rotate(-288deg); } to { transform: rotate(648deg) translateX(140px) rotate(-648deg); } }
        @keyframes core-pulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes ring-spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ring-spin-r { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>

      {/* Deep gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040608] via-[#080d16] to-[#040608]" />

      {/* Ambient glow orbs */}
      <motion.div
        animate={{ x: [0, 30, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.04, 0.96, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[600px] w-[600px] rounded-full opacity-[0.08]"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 65%)", top: "0%", left: "10%" }}
      />
      <motion.div
        animate={{ x: [0, -20, 25, 0], y: [0, 30, -15, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-[450px] w-[450px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 65%)", bottom: "5%", right: "0%" }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Animated data flow particles */}
      <PulseDot x="15%" y="25%" delay={0} />
      <PulseDot x="78%" y="18%" delay={0.8} color="#8b5cf6" />
      <PulseDot x="85%" y="65%" delay={1.6} />
      <PulseDot x="12%" y="72%" delay={2.4} color="#22c55e" />
      <PulseDot x="50%" y="88%" delay={1.2} color="#8b5cf6" />
      <PulseDot x="35%" y="10%" delay={3} />

      {/* ═══════════ CENTRAL ORB + ORBITING ICONS ═══════════ */}
      <div className="relative z-10" style={{ transformStyle: "preserve-3d" }}>

        {/* Glowing core orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex h-[100px] w-[100px] items-center justify-center"
          style={{ left: "50%", top: "50%", marginLeft: -50, marginTop: -50 }}
        >
          {/* Rings */}
          <div className="absolute h-[280px] w-[280px] rounded-full border border-dashed border-white/[0.04]"
            style={{ animation: "ring-spin 40s linear infinite", left: "50%", top: "50%", marginLeft: -140, marginTop: -140 }} />
          <div className="absolute h-[200px] w-[200px] rounded-full border border-white/[0.06]"
            style={{ animation: "ring-spin-r 30s linear infinite", left: "50%", top: "50%", marginLeft: -100, marginTop: -100 }} />
          <div className="absolute h-[130px] w-[130px] rounded-full border border-[#3b82f6]/15"
            style={{ left: "50%", top: "50%", marginLeft: -65, marginTop: -65 }} />

          {/* Core sphere */}
          <div className="relative h-[80px] w-[80px] rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 35%, #60a5fa 0%, #3b82f6 40%, #1d4ed8 80%, #1e3a5f 100%)",
              boxShadow: "0 0 60px rgba(59,130,246,0.4), 0 0 120px rgba(59,130,246,0.15), inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
              animation: "core-pulse 4s ease-in-out infinite",
            }}
          >
            <div className="absolute top-2 left-3 h-6 w-6 rounded-full bg-white/20 blur-[3px]" />
            <div className="flex h-full w-full items-center justify-center">
              <Zap className="h-7 w-7 text-white drop-shadow-lg" />
            </div>
          </div>
        </motion.div>

        {/* Orbiting integration icons */}
        {/* Slack */}
        <OrbitIcon delay={0.4} duration={25} startAngle={0} size={44}>
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.527 2.527 0 0 1 0 8.834a2.527 2.527 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.164 0a2.527 2.527 0 0 1 2.521 2.522v6.312z" fill="#2EB67D"/><path d="M15.164 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.164 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.527 2.527 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.314z" fill="#ECB22E"/></svg>
        </OrbitIcon>
        {/* Gmail */}
        <OrbitIcon delay={0.6} duration={28} startAngle={72} size={40}>
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>
        </OrbitIcon>
        {/* GitHub */}
        <OrbitIcon delay={0.8} duration={22} startAngle={144} size={40}>
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" fill="#fff"/></svg>
        </OrbitIcon>
        {/* Google Sheets */}
        <OrbitIcon delay={1.0} duration={26} startAngle={216} size={38}>
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M19.5 7H15V1.5L19.5 7z" fill="#188038"/><path d="M19.5 7H15V1.5l.5-.5H6a1 1 0 0 0-1 1v20a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V7.5l-.5-.5z" fill="#34A853"/><rect x="8" y="12" width="8" height="1.5" rx="0.3" fill="#fff" opacity="0.8"/><rect x="8" y="15" width="8" height="1.5" rx="0.3" fill="#fff" opacity="0.6"/><rect x="8" y="18" width="5" height="1.5" rx="0.3" fill="#fff" opacity="0.4"/></svg>
        </OrbitIcon>
        {/* Notion */}
        <OrbitIcon delay={1.2} duration={30} startAngle={288} size={38}>
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.06 2.2c-.42-.326-.98-.7-2.055-.607L3.01 2.669c-.467.047-.56.28-.374.467l1.823 1.072zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.166V6.348c0-.606-.233-.933-.747-.887l-15.177.887c-.56.047-.746.327-.746.94zm14.337.746c.093.42 0 .84-.42.887l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.747 0-.933-.234-1.493-.933l-4.573-7.178v6.945l1.447.327s0 .84-1.167.84l-3.22.187c-.093-.187 0-.653.327-.747l.84-.213V9.854L7.467 9.76c-.093-.42.14-1.026.793-1.073l3.453-.233 4.76 7.272v-6.432l-1.213-.14c-.094-.513.28-.886.747-.932l3.453-.234z" fillRule="evenodd"/></svg>
        </OrbitIcon>
      </div>

      {/* ═══════════ FLOATING 3D FEATURE CARDS ═══════════ */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ perspective: "1000px" }}>
        {/* Top-left: AI Builder */}
        <div className="absolute pointer-events-auto" style={{ left: "3%", top: "6%" }}>
          <FeatureCard
            delay={0.5}
            icon={<Zap className="h-4 w-4 text-[#3b82f6]" />}
            title="AI-Powered Builder"
            desc="Describe your workflow in plain English. Our AI builds it for you."
          />
        </div>
        {/* Bottom-right: Zero-code */}
        <div className="absolute pointer-events-auto" style={{ right: "3%", bottom: "18%" }}>
          <FeatureCard
            delay={0.8}
            icon={<svg className="h-4 w-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>}
            title="Zero-Code Workflows"
            desc="Connect apps visually. No programming skills required."
          />
        </div>
        {/* Bottom-left: Real-time */}
        <div className="absolute pointer-events-auto" style={{ left: "5%", bottom: "5%" }}>
          <FeatureCard
            delay={1.1}
            icon={<svg className="h-4 w-4 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
            title="Real-Time Monitoring"
            desc="Track every execution. Debug issues before they impact your business."
          />
        </div>
      </div>

      {/* ═══════════ BOTTOM: Live workflow pipeline ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0f18]/80 px-5 py-3 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          {/* Trigger */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#22c55e]/15">
              <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
            </div>
            <span className="text-[0.65rem] font-semibold text-white/50">Trigger</span>
          </div>
          {/* Flow arrow 1 */}
          <div className="relative w-8 h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 w-3 rounded-full bg-[#3b82f6]"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
            />
          </div>
          {/* AI Process */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3b82f6]/15">
              <Zap className="h-3 w-3 text-[#3b82f6]" />
            </div>
            <span className="text-[0.65rem] font-semibold text-white/50">AI Process</span>
          </div>
          {/* Flow arrow 2 */}
          <div className="relative w-8 h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 w-3 rounded-full bg-[#8b5cf6]"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
            />
          </div>
          {/* Deploy */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8b5cf6]/15">
              <ArrowRight className="h-3 w-3 text-[#8b5cf6]" />
            </div>
            <span className="text-[0.65rem] font-semibold text-white/50">Deploy</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN AUTH SCREEN COMPONENT
   ═══════════════════════════════════════════════ */
export default function AuthScreen({
  mode,
  nextPath,
  initialError = null,
  socialAuthEnabled,
  ssoEnabled,
  focusSso = false,
}: AuthScreenProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [loginStep, setLoginStep] = useState<"methods" | "email" | "forgot-password">("methods");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const googleHref = `/api/auth/oauth?provider=google&next=${encodeURIComponent(nextPath)}`;

  /* ─── Password submit ─── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { name, email, password } : { email, password }),
      });
      const json = (await res.json()) as {
        error?: string;
        user?: { onboarded: boolean };
        needsEmailVerification?: boolean;
      };
      if (!res.ok) {
        if (json.needsEmailVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(json.error || "Authentication failed.");
      }
      if (json.needsEmailVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      let finalPath = nextPath;
      if (json.user && json.user.onboarded === false) finalPath = "/onboarding";
      router.push(finalPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ─── Magic link submit ─── */
  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMagicLoading(true);
    setMagicError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send magic link.");
      setMagicSent(true);
    } catch (err) {
      setMagicError(err instanceof Error ? err.message : "Could not send magic link.");
    } finally {
      setMagicLoading(false);
    }
  };

  /* ─── Reset Password submit ─── */
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send reset link.");
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not send reset link.");
    } finally {
      setResetLoading(false);
    }
  };

  const title = isSignup ? "Create your account" : "Welcome back";

  const inputCls =
    "h-[50px] w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 text-[0.875rem] text-white outline-none transition-all duration-200 placeholder:text-white/20 focus:border-[#3b82f6]/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#3b82f6]/10";

  const primaryBtnCls =
    "flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#ededed] text-[0.875rem] font-semibold text-[#0a0a0a] transition-all duration-200 hover:bg-[#3b82f6] hover:shadow-[0_4px_24px_rgba(59,130,246,0.2)] disabled:cursor-not-allowed disabled:opacity-60";

  const socialBtnCls =
    "flex h-[50px] w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-[0.875rem] font-semibold text-white transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.07]";

  return (
    <main className="flex min-h-screen w-full bg-[#0a0a0a]">

      {/* ═══════════ LEFT PANEL — Auth form ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="relative flex w-full flex-col items-center justify-center px-6 py-10 lg:w-[50%]"
      >
        <div className="w-full max-w-[420px]">

          {/* Logo + Heading */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mb-8 flex flex-col items-center"
          >
            <Link href="/" className="mb-6 block">
              <Image src="/logo-new.png" alt="AutomateCraft" width={56} height={56} className="object-contain" priority />
            </Link>
            <h1 className="text-center text-[1.85rem] font-semibold tracking-[-0.02em] text-white">
              {title}
            </h1>
            <p className="mt-2 text-center text-[0.9rem] text-white/35">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <Link
                href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
                className="font-semibold text-[#3b82f6] transition-colors hover:text-[#60a5fa]"
              >
                {isSignup ? "Sign in" : "Sign up for free"}
              </Link>
            </p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {(error || magicError || resetError) && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-center text-[0.825rem] font-medium text-red-400"
              >
                {error || magicError || resetError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══════════ LOGIN FLOW — two steps ══════════ */}
          {!isSignup ? (
            <AnimatePresence mode="wait">

              {/* STEP 1: Google + Continue with Email */}
              {loginStep === "methods" ? (
                <motion.div
                  key="step-methods"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-3">
                    <a
                      href={socialAuthEnabled ? googleHref : undefined}
                      aria-disabled={!socialAuthEnabled}
                      id="google-signin-btn"
                      className={`${socialBtnCls} ${!socialAuthEnabled ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </a>

                    <button
                      type="button"
                      id="continue-with-email-btn"
                      onClick={() => { setLoginStep("email"); setError(null); setMagicError(null); }}
                      className={socialBtnCls}
                    >
                      <MailIcon />
                      Continue with Email
                    </button>
                  </div>

                  <p className="mt-10 text-center text-[0.7rem] leading-5 text-white/[0.18]">
                    By continuing, you agree to our{" "}
                    <span className="text-white/30">Terms of Service</span> and{" "}
                    <span className="text-white/30">Privacy Policy</span>.
                  </p>
                </motion.div>

              ) : loginStep === "email" ? (
                /* STEP 2: Email + Password + Magic Link */
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => { setLoginStep("methods"); setError(null); setMagicError(null); setMagicSent(false); }}
                    className="mb-6 flex items-center gap-1.5 text-[0.8rem] font-medium text-white/30 transition-colors hover:text-white/60"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All sign in options
                  </button>

                  {magicSent ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20">
                        <CheckCircle2 className="h-8 w-8 text-[#3b82f6]" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold text-white">Check your inbox</h2>
                      <p className="mb-1 text-sm text-white/40">We sent a login link to</p>
                      <p className="mb-6 text-sm font-semibold text-[#3b82f6]">{email}</p>
                      <p className="mb-4 text-xs text-white/25">Click the link in the email to sign in. Expires in 1 hour.</p>
                      <button
                        type="button"
                        onClick={() => { setMagicSent(false); setEmail(""); }}
                        className="text-sm font-medium text-white/30 hover:text-white/60 transition-colors"
                      >
                        Use a different email
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" autoFocus className={inputCls} />
                        <div className="relative mb-1">
                          <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="Password" autoComplete="current-password" className={`${inputCls} pr-16`} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <div />
                          <button type="button" onClick={() => { setLoginStep("forgot-password"); setError(null); setResetError(null); setResetSent(false); }} className="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                            Forgot password?
                          </button>
                        </div>
                        <button type="submit" disabled={loading} className={primaryBtnCls}>
                          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>) : (<>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>)}
                        </button>
                      </form>

                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/[0.06]" /></div>
                        <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[0.68rem] font-medium text-white/20">or sign in without a password</span></div>
                      </div>

                      <form onSubmit={handleMagicLink}>
                        <button type="submit" disabled={magicLoading || !email} id="send-magic-link-btn" className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[0.875rem] font-semibold text-white/70 transition-all duration-200 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                          {magicLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending link...</>) : (<><Mail className="h-4 w-4" /> Send magic link instead</>)}
                        </button>
                        <p className="mt-2.5 text-center text-[0.7rem] text-white/20">Uses the email above — no password needed.</p>
                      </form>
                    </>
                  )}
                </motion.div>

              ) : (
                /* STEP 3: Forgot Password */
                <motion.div
                  key="step-forgot"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => { setLoginStep("email"); setResetError(null); setResetSent(false); }}
                    className="mb-6 flex items-center gap-1.5 text-[0.8rem] font-medium text-white/30 transition-colors hover:text-white/60"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </button>

                  {resetSent ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#3b82f6]/10 ring-1 ring-[#3b82f6]/20">
                        <CheckCircle2 className="h-8 w-8 text-[#3b82f6]" />
                      </div>
                      <h2 className="mb-2 text-lg font-semibold text-white">Check your email</h2>
                      <p className="mb-1 text-sm text-white/40">We sent a password reset link to</p>
                      <p className="mb-6 text-sm font-semibold text-[#3b82f6]">{email}</p>
                      <p className="mb-4 text-xs text-white/25">Click the link in the email to reset your password.</p>
                      <button
                        type="button"
                        onClick={() => { setLoginStep("email"); }}
                        className="text-sm font-medium text-white/30 hover:text-white/60 transition-colors"
                      >
                        Return to sign in
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white mb-2">Reset Password</h2>
                        <p className="text-sm text-white/40">Enter your email address and we'll send you a link to reset your password.</p>
                      </div>
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" autoFocus className={inputCls} />
                        <button type="submit" disabled={resetLoading || !email} className={primaryBtnCls}>
                          {resetLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>) : "Send reset link"}
                        </button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          ) : (
            /* ══════════ SIGNUP FLOW — single step ══════════ */
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <a href={socialAuthEnabled ? googleHref : undefined} aria-disabled={!socialAuthEnabled} id="google-signup-btn" className={`${socialBtnCls} ${!socialAuthEnabled ? "cursor-not-allowed opacity-40" : ""}`}>
                <GoogleIcon /> Continue with Google
              </a>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[0.7rem] font-medium text-white/25">Or sign up with email</span></div>
              </div>

              <form className="space-y-3" onSubmit={handleSubmit}>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" className={inputCls} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" className={inputCls} />
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} placeholder="Password (min. 8 characters)" autoComplete="new-password" className={`${inputCls} pr-16`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button type="submit" disabled={loading} className={primaryBtnCls}>
                  {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>) : (<>Create account <ArrowRight className="h-4 w-4 ml-1" /></>)}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-white/[0.06]" /></div>
                <div className="relative flex justify-center"><span className="bg-[#0a0a0a] px-4 text-[0.68rem] font-medium text-white/20">or sign up without a password</span></div>
              </div>

              <form onSubmit={handleMagicLink}>
                <button type="submit" disabled={magicLoading || !email} className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[0.875rem] font-semibold text-white/70 transition-all duration-200 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                  {magicLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Sending link...</>) : (<><Mail className="h-4 w-4" /> Send magic link instead</>)}
                </button>
                <p className="mt-2.5 text-center text-[0.7rem] text-white/20">Uses the email above — no password needed.</p>
              </form>

              <p className="mt-8 text-center text-[0.7rem] leading-5 text-white/[0.18]">
                By continuing, you agree to our{" "}
                <span className="text-white/30">Terms of Service</span> and{" "}
                <span className="text-white/30">Privacy Policy</span>.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ═══════════ RIGHT PANEL — Hero visual ═══════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="hidden lg:block lg:w-[50%]"
      >
        <div className="relative h-full border-l border-white/[0.04]">
          <HeroVisual />
        </div>
      </motion.div>
    </main>
  );
}
