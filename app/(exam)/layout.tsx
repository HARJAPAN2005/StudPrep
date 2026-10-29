import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CBT Examination Runner · StudPilot",
  description: "Distraction-free computer-based testing examination environment.",
};

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
      {children}
    </div>
  );
}

