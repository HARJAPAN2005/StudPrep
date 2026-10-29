import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_MATERIALS } from "@/lib/fixtures/mock-data";
import { MaterialDetailClient, MaterialDetailData, ExtractedPageItem } from "./material-detail-client";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Material Analysis · StudPilot",
  description: "Detailed curriculum breakdown, key topics, and AI question analysis.",
};

export const instant = false;

export function generateStaticParams() {
  return MOCK_MATERIALS.map((material) => ({
    id: material.id,
  }));
}

interface MaterialDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MaterialDetailPage({ params }: MaterialDetailPageProps) {
  const { id } = await params;

  let detailData: MaterialDetailData | null = null;

  try {
    const supabase = await createClient();

    // Query real document if database is connected
    const { data: doc } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (doc) {
      // Query processing job
      const { data: job } = await supabase
        .from("document_processing_jobs")
        .select("*")
        .eq("document_id", id)
        .single();

      // Query extracted pages
      const { data: pages } = await supabase
        .from("document_pages")
        .select("*")
        .eq("document_id", id)
        .order("page_number", { ascending: true });

      const mappedPages: ExtractedPageItem[] = (pages ?? []).map((p) => ({
        pageNumber: p.page_number,
        extractedText: p.extracted_text,
        wordCount: p.word_count,
        hasLowText: p.has_low_text,
      }));

      const subjectName = "General Studies";

      detailData = {
        id: doc.id,
        title: doc.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
        filename: doc.filename,
        subjectName,
        fileSizeFormatted: `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`,
        pageCount: doc.page_count ?? mappedPages.length ?? 1,
        status: job?.status ?? (doc.status as "ready" | "processing" | "failed") ?? "ready",
        errorMessage: doc.error_message || job?.error_message,
        extractionWarnings: job?.extraction_warnings ?? [],
        keyTopics: ["Extracted Syllabus", "Practice Curriculum"],
        summary: "Synthesized syllabus concepts extracted from uploaded reference pages.",
        generatedQuestionsCount: 0,
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        pages: mappedPages,
      };
    }
  } catch {
    // If database query fails or during static prerender, fall back to mock data
  }

  // Fallback to mock fixture
  if (!detailData) {
    const mock = MOCK_MATERIALS.find((m) => m.id === id) || MOCK_MATERIALS[0];
    if (!mock) {
      notFound();
    }

    const mockPages: ExtractedPageItem[] = Array.from({ length: mock.pageCount }, (_, i) => ({
      pageNumber: i + 1,
      extractedText: `[Page ${i + 1} Extracted Text - ${mock.title}]: Core subject syllabus concepts covering examination fundamentals, formulas, and critical problem-solving methodologies for ${mock.subjectName}.`,
      wordCount: 165,
      hasLowText: i === 2, // demonstrate a low text page
    }));

    detailData = {
      id: mock.id,
      title: mock.title,
      filename: mock.filename,
      subjectName: mock.subjectName,
      fileSizeFormatted: mock.fileSizeFormatted,
      pageCount: mock.pageCount,
      status: mock.status === "ready" ? "ready" : "processing",
      extractionWarnings: ["Scanned diagram detected on page 3. Text extracted with 94% confidence."],
      keyTopics: mock.keyTopics,
      summary: mock.summary,
      generatedQuestionsCount: mock.generatedQuestionsCount,
      difficultyBreakdown: mock.difficultyBreakdown,
      pages: mockPages,
    };
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Breadcrumb Navigation */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2 mb-2"
        >
          <Link href="/dashboard/materials">
            <ArrowLeft className="h-4 w-4" /> Back to Material Library
          </Link>
        </Button>
      </div>

      {/* Interactive Detail & Preview Tabs */}
      <MaterialDetailClient data={detailData} />
    </div>
  );
}
