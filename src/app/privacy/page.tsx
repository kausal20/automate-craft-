import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — AutomateCraft",
  description: "How AutomateCraft handles your data, privacy, and security.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-6 py-28 lg:py-36">
        {/* Header */}
        <div className="mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-accent">
            Legal
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-white/35">
            Last updated: April 24, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose-custom space-y-10">
          <Section title="1. Information We Collect">
            <p>When you create an account or use AutomateCraft, we may collect:</p>
            <ul>
              <li><strong>Account Information:</strong> Your name, email address, and authentication credentials (via Google OAuth or email/password).</li>
              <li><strong>Usage Data:</strong> Information about how you use the platform, including automations created, API calls made, and features accessed.</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Razorpay. We do not store your full card details on our servers.</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security and analytics purposes.</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve AutomateCraft services.</li>
              <li>Process transactions and manage your account.</li>
              <li>Send service-related notifications (e.g., automation failures, billing updates).</li>
              <li>Analyze usage patterns to improve the product experience.</li>
              <li>Ensure platform security and prevent abuse.</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>
          </Section>

          <Section title="3. Third-Party Services">
            <p>AutomateCraft integrates with third-party services you choose to connect (e.g., Google Sheets, Slack, WhatsApp). When you connect these services:</p>
            <ul>
              <li>We access only the data necessary to execute your automations.</li>
              <li>Your credentials for third-party services are encrypted and stored securely.</li>
              <li>You can disconnect any integration at any time from your dashboard.</li>
            </ul>
          </Section>

          <Section title="4. Data Storage & Security">
            <p>Your data is stored on secure, encrypted servers. We implement industry-standard security measures including:</p>
            <ul>
              <li>TLS/SSL encryption for all data in transit.</li>
              <li>Encrypted storage for sensitive credentials and API keys.</li>
              <li>Regular security audits and vulnerability assessments.</li>
              <li>Role-based access controls for internal team members.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your data for as long as your account is active. Automation execution logs are retained for 90 days by default. If you delete your account, we will remove your personal data within 30 days, except where required by law.</p>
          </Section>

          <Section title="6. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Export your automation configurations.</li>
              <li>Withdraw consent for optional data processing.</li>
            </ul>
          </Section>

          <Section title="7. Cookies">
            <p>We use essential cookies to maintain your session and authentication state. We do not use third-party tracking cookies. Analytics, if any, are privacy-respecting and anonymized.</p>
          </Section>

          <Section title="8. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. When we make changes, we will update the &quot;Last updated&quot; date at the top of this page. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="9. Contact">
            <p>If you have questions about this Privacy Policy or your data, please reach out at{" "}
              <a href="mailto:hello@automatecraft.ai" className="text-accent hover:underline">
                hello@automatecraft.ai
              </a>{" "}
              or through our{" "}
              <Link href="/lets-talk" className="text-accent hover:underline">
                contact form
              </Link>.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight text-white/90">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-white/45 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_strong]:text-white/60 [&_li]:pl-1">
        {children}
      </div>
    </section>
  );
}
