import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_MATERIALS } from "@/lib/fixtures/mock-data";
import { MaterialDetailClient, MaterialDetailData, ExtractedPageItem } from "./material-detail-client";
import { createClient } from "@/lib/supabase/server";
import type { TopicItem, DetectedQuestion } from "@/lib/ai/schemas";

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

      // Query AI intelligence analysis
      const { data: analysis } = await supabase
        .from("material_analyses")
        .select("*")
        .eq("document_id", id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

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
        status: (job?.status || doc.status || "ready") as MaterialDetailData["status"],
        errorMessage: doc.error_message || job?.error_message,
        extractionWarnings: (analysis?.extraction_warnings as string[]) ?? job?.extraction_warnings ?? [],
        keyTopics: ["Extracted Syllabus", "Practice Curriculum"],
        summary: "Synthesized syllabus concepts extracted from uploaded reference pages.",
        generatedQuestionsCount: Array.isArray(analysis?.extracted_questions)
          ? analysis.extracted_questions.length
          : 0,
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        pages: mappedPages,
        classification: analysis?.classification as unknown as MaterialDetailData["classification"],
        topicsHierarchy: analysis?.topics_hierarchy as unknown as TopicItem[],
        extractedQuestions: analysis?.extracted_questions as unknown as DetectedQuestion[],
        contentMap: analysis?.content_map as unknown as MaterialDetailData["contentMap"],
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

    const mockTopics = [
      {
        id: "top-1",
        title: `${mock.subjectName} Fundamentals & Core Theories`,
        pageReferences: [1, 2],
        subtopics: [
          {
            id: "sub-1-1",
            title: "Standard Definitions, Terminology & Principles",
            pageReferences: [1],
            evidenceCitation: `Foundational definitions established for ${mock.subjectName} curriculum.`,
          },
          {
            id: "sub-1-2",
            title: "Calculations, Working Formulas & Standard Equations",
            pageReferences: [2],
            evidenceCitation: `Mathematical formulas and empirical derivations specified in standard past papers.`,
          },
        ],
      },
      {
        id: "top-2",
        title: "Applied Problem Solving & Exam Case Studies",
        pageReferences: [3, 4],
        subtopics: [
          {
            id: "sub-2-1",
            title: "Step-by-Step Computational Worked Examples",
            pageReferences: [3],
            evidenceCitation: `Worked solutions demonstrating multi-step reasoning for West African exams.`,
          },
        ],
      },
    ];

    const mockQuestions = [
      {
        id: "q-1",
        questionNumber: "1",
        body: `Which of the following principles best describes the fundamental operation in ${mock.subjectName}?`,
        options: [
          { label: "A", text: "Linear conservation under isolated system constraints" },
          { label: "B", text: "Exponential divergence without equilibrium state" },
          { label: "C", text: "Stochastic equilibrium dependent on ambient entropy" },
          { label: "D", text: "Constant scalar proportionality without variable friction" },
        ],
        instructions: "Choose the correct option from A to D.",
        marks: 2,
        containsTable: false,
        containsEquation: true,
        answerKey: "A",
        isComplete: true,
        missingElements: [],
        pageNumber: 1,
      },
      {
        id: "q-2",
        questionNumber: "2",
        body: `Calculate the resultant derivative when boundary parameters approach unit infinity.`,
        options: [
          { label: "A", text: "0" },
          { label: "B", text: "1" },
          { label: "C", text: "Undefined" },
          { label: "D", text: "e^x" },
        ],
        instructions: null,
        marks: 3,
        containsTable: false,
        containsEquation: true,
        answerKey: "B",
        isComplete: true,
        missingElements: [],
        pageNumber: 2,
      },
      {
        id: "q-3",
        questionNumber: "3",
        body: `Based on the experimental data on page 3, identify the limiting reagent in the reaction.`,
        options: [
          { label: "A", text: "Hydrochloric acid (HCl)" },
          { label: "B", text: "Sodium carbonate (Na2CO3)" },
        ],
        instructions: null,
        marks: 2,
        containsTable: true,
        containsEquation: false,
        answerKey: null,
        isComplete: false,
        missingElements: ["Option C", "Option D"],
        pageNumber: 3,
      },
    ];

    detailData = {
      id: mock.id,
      title: mock.title,
      filename: mock.filename,
      subjectName: mock.subjectName,
      fileSizeFormatted: mock.fileSizeFormatted,
      pageCount: mock.pageCount,
      status: mock.status === "ready" ? "ready" : "processing",
      extractionWarnings: [
        "Page 3 question 3 is incomplete: options C and D not detected in source text.",
        "Scanned diagram detected on page 3. Text extracted with 94% confidence.",
      ],
      keyTopics: mock.keyTopics,
      summary: mock.summary,
      generatedQuestionsCount: mockQuestions.length,
      difficultyBreakdown: mock.difficultyBreakdown,
      pages: mockPages,
      classification: {
        subject: mock.subjectName,
        educationalLevel: "senior_secondary",
        examinationType: "JAMB_UTME",
        likelyLanguage: "English",
        confidence: 0.95,
        reasoning: "Curriculum structure, difficulty tier, and question phrasing match JAMB UTME format.",
      },
      topicsHierarchy: mockTopics,
      extractedQuestions: mockQuestions,
      contentMap: {
        totalTopics: mockTopics.length,
        coveragePercentage: 88,
        estimatedDepth: "intermediate",
        identifiedGaps: ["Advanced calculus integration", "Electromagnetic wave propagation"],
        recommendedPrerequisites: ["Senior Secondary Mathematics", "Basic Physical Sciences"],
      },
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

      {/* Interactive Detail, Intelligence Diagnostics & Preview Tabs */}
      <MaterialDetailClient data={detailData} />
    </div>
  );
}
