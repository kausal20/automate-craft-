import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Let's Talk — AutomateCraft",
  description:
    "Tell us about your workflow. We'll design a custom automation architecture tailored to your business needs.",
  openGraph: {
    title: "Let's Talk — AutomateCraft",
    description:
      "Tell us about your workflow. We'll design a custom automation architecture for you.",
  },
};

export default function LetsTalkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
