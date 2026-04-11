import SlideViewer from "@/components/SlideViewer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FieldMarshal Ireland Market Report",
  description: "Market Analysis Report: Ireland Water Pump Industry & Opportunities",
};

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <SlideViewer />
    </main>
  );
}
