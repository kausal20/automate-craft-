import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Terms of Service — AutomateCraft",
  description: "Terms and conditions for using the AutomateCraft platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-6 py-28 lg:py-36">
        <div className="mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Legal
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-white/35">Last updated: April 24, 2026</p>
        </div>

        <div className="space-y-10">
          <S t="1. Acceptance of Terms">
            <p>By accessing or using AutomateCraft (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.</p>
          </S>
          <S t="2. Description of Service">
            <p>AutomateCraft is an AI-powered automation platform that allows users to create, configure, and deploy automated workflows. The Service includes a web-based dashboard, AI-assisted workflow builder, and execution engine.</p>
          </S>
          <S t="3. Account Registration">
            <p>To use AutomateCraft, you must create an account using a valid email address or Google authentication. You are responsible for:</p>
            <ul>
              <li>Maintaining the security of your account credentials.</li>
              <li>All activities that occur under your account.</li>
              <li>Providing accurate and up-to-date information.</li>
            </ul>
          </S>
          <S t="4. Credits & Billing">
            <p>AutomateCraft operates on a credit-based system:</p>
            <ul>
              <li>Credits are consumed when you create or run automations.</li>
              <li>Purchased credits are non-refundable unless required by applicable law.</li>
              <li>Subscription plans renew automatically at the end of each billing cycle.</li>
              <li>You may cancel your subscription at any time from your dashboard. Cancellation takes effect at the end of the current billing period.</li>
              <li>We reserve the right to modify pricing with 30 days advance notice.</li>
            </ul>
          </S>
          <S t="5. Acceptable Use">
            <p>You agree not to use AutomateCraft to:</p>
            <ul>
              <li>Send spam, unsolicited messages, or bulk communications.</li>
              <li>Violate any applicable laws or regulations.</li>
              <li>Infringe on the intellectual property rights of others.</li>
              <li>Distribute malware or engage in any malicious activity.</li>
              <li>Attempt to gain unauthorized access to the Service or its infrastructure.</li>
              <li>Overload the platform through automated abuse or excessive API calls.</li>
            </ul>
          </S>
          <S t="6. Intellectual Property">
            <p>You retain ownership of the automation configurations and data you create using AutomateCraft. We retain ownership of the platform, its code, design, and underlying technology. You may not copy, modify, or reverse-engineer any part of the Service.</p>
          </S>
          <S t="7. Third-Party Integrations">
            <p>AutomateCraft connects to third-party services (e.g., Google, Slack, WhatsApp) on your behalf. Your use of these integrations is subject to the respective third party&apos;s terms and policies. We are not responsible for the availability or actions of third-party services.</p>
          </S>
          <S t="8. Service Availability">
            <p>We strive to maintain high uptime but do not guarantee uninterrupted access. We may temporarily suspend the Service for maintenance, updates, or security reasons. We will provide reasonable notice when possible.</p>
          </S>
          <S t="9. Limitation of Liability">
            <p>To the maximum extent permitted by law, AutomateCraft shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to lost profits, data loss, or business interruption.</p>
          </S>
          <S t="10. Termination">
            <p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from the Settings page. Upon termination, your data will be deleted in accordance with our <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.</p>
          </S>
          <S t="11. Changes to Terms">
            <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance. We will notify users of material changes via email or in-app notification.</p>
          </S>
          <S t="12. Contact">
            <p>Questions about these Terms? Contact us at{" "}
              <a href="mailto:hello@automatecraft.ai" className="text-accent hover:underline">hello@automatecraft.ai</a>.
            </p>
          </S>
        </div>
      </div>
    </main>
  );
}

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <Reveal>
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-white/90">{t}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-white/45 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_strong]:text-white/60 [&_li]:pl-1">{children}</div>
    </section>
    </Reveal>
  );
}
