import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — AutomateCraft",
  description:
    "Simple, credit-based pricing for AI-powered automation. Start free with 10 credits — no credit card required. Scale with Plus, Pro, or Enterprise plans.",
  openGraph: {
    title: "Pricing — AutomateCraft",
    description:
      "Simple, credit-based pricing for AI-powered automation. Start free with 10 credits.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
