import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why AutomateCraft — AI Automation That Works",
  description:
    "See how AutomateCraft compares to Zapier, Make, and manual workflows. AI-powered builder, plain English prompts, and credit-based pricing.",
  openGraph: {
    title: "Why AutomateCraft — AI Automation That Works",
    description:
      "See how AutomateCraft compares to Zapier, Make, and manual workflows.",
  },
};

export default function WhyUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
