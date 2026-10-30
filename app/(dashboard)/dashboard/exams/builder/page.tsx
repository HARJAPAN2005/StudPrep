import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MOCK_SUBJECTS, MOCK_MATERIALS } from "@/lib/fixtures/mock-data";
import {
  ExamStudioClient,
  type StudioSubjectItem,
  type StudioMaterialItem,
} from "./exam-studio-client";

export const metadata: Metadata = {
  title: "CBT Exam Studio · StudPilot",
  description: "Configure, generate, verify, and launch authentic CBT examination sessions.",
};

export const instant = false;

export default async function ExamBuilderPage() {
  let subjects: StudioSubjectItem[] = MOCK_SUBJECTS.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
  }));

  let materials: StudioMaterialItem[] = MOCK_MATERIALS.map((m) => ({
    id: m.id,
    title: m.title,
    filename: m.title.toLowerCase().replace(/\s+/g, "-") + ".pdf",
    hasAnalysis: true,
    detectedQuestionsCount: 15,
  }));

  try {
    const supabase = await createClient();

    // Fetch subjects
    const { data: dbSubjects } = await supabase
      .from("subjects")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (dbSubjects && dbSubjects.length > 0) {
      subjects = dbSubjects;
    }

    // Fetch documents & analyses
    const { data: dbDocs } = await supabase
      .from("documents")
      .select("id, filename")
      .order("created_at", { ascending: false });

    if (dbDocs && dbDocs.length > 0) {
      const docIds = dbDocs.map((d) => d.id);
      const { data: dbAnalyses } = await supabase
        .from("material_analyses")
        .select("document_id, extracted_questions")
        .in("document_id", docIds);

      const countMap = new Map<string, number>();
      if (dbAnalyses) {
        for (const a of dbAnalyses) {
          const count = Array.isArray(a.extracted_questions) ? a.extracted_questions.length : 0;
          countMap.set(a.document_id, count);
        }
      }

      materials = dbDocs.map((d) => {
        const count = countMap.get(d.id) ?? 0;
        return {
          id: d.id,
          title: d.filename.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
          filename: d.filename,
          hasAnalysis: count > 0,
          detectedQuestionsCount: count,
        };
      });
    }
  } catch {
    // Fall back to mock fixtures
  }

  return <ExamStudioClient initialSubjects={subjects} initialMaterials={materials} />;
}
