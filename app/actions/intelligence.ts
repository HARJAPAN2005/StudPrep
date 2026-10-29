"use server";

/**
 * AI Document Intelligence Server Actions
 *
 * ⚠️ SECURITY CRITICAL ⚠️
 * All operations enforce authenticated student sessions and verify document ownership
 * before launching AI pipeline execution, updating metadata, or recording candidate corrections.
 *
 * @module app/actions/intelligence
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, verifyDocumentAccess } from "@/lib/auth/authorization";
import { runDocumentIntelligencePipeline } from "@/lib/ai/pipeline";
import type { Json } from "@/types/supabase";
import { z } from "zod";

const MetadataCorrectionSchema = z.object({
  subject: z.string().min(2).max(100).optional(),
  examinationType: z
    .enum(["JAMB_UTME", "WAEC_WASSCE", "NECO_SSCE", "ICAN", "GENERAL_ACADEMIC"])
    .optional(),
  educationalLevel: z
    .enum(["senior_secondary", "undergraduate", "professional", "general"])
    .optional(),
});

const FlagMistakeSchema = z.object({
  field: z.string().min(2).max(100),
  reason: z.string().min(5).max(500),
  originalValue: z.unknown(),
  correctedValue: z.unknown().optional(),
});

/**
 * Triggers the 6-stage AI Document Intelligence pipeline for a document.
 */
export async function runMaterialAnalysisAction(
  documentId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Ownership verification
  await verifyDocumentAccess(supabase, documentId, user.id);

  try {
    await runDocumentIntelligencePipeline(supabase, documentId);
    revalidatePath(`/dashboard/materials/${documentId}`);
    return {
      success: true,
      message: "AI Document Intelligence analysis completed successfully.",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Analysis failed: ${errorMsg}`,
    };
  }
}

/**
 * Allows a student to correct inferred metadata (Subject, Examination Board, Educational Level).
 */
export async function correctMaterialMetadataAction(
  documentId: string,
  corrections: z.infer<typeof MetadataCorrectionSchema>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Ownership verification
  await verifyDocumentAccess(supabase, documentId, user.id);

  const parsed = MetadataCorrectionSchema.safeParse(corrections);
  if (!parsed.success) {
    return { success: false, error: "Invalid metadata correction format." };
  }

  // Fetch current analysis
  const { data: analysis } = await supabase
    .from("material_analyses")
    .select("id, classification")
    .eq("document_id", documentId)
    .single();

  if (!analysis) {
    return { success: false, error: "Material analysis not found." };
  }

  const currentClassification = (analysis.classification as Record<string, unknown>) || {};
  const updatedClassification = {
    ...currentClassification,
    ...parsed.data,
  };

  // Record audit correction
  await supabase.from("material_corrections").insert({
    analysis_id: analysis.id,
    document_id: documentId,
    user_id: user.id,
    field: "metadata_classification",
    original_value: currentClassification as unknown as Json,
    corrected_value: updatedClassification as unknown as Json,
    flag_reason: "Student corrected inferred classification metadata",
  });

  // Update classification on material_analyses
  await supabase
    .from("material_analyses")
    .update({ classification: updatedClassification as unknown as Json })
    .eq("id", analysis.id);

  revalidatePath(`/dashboard/materials/${documentId}`);
  return { success: true, message: "Metadata successfully updated." };
}

/**
 * Allows a candidate to flag an extraction mistake (e.g. wrong answer key or question text).
 */
export async function flagExtractionMistakeAction(
  documentId: string,
  flagData: z.infer<typeof FlagMistakeSchema>
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Ownership verification
  await verifyDocumentAccess(supabase, documentId, user.id);

  const parsed = FlagMistakeSchema.safeParse(flagData);
  if (!parsed.success) {
    return { success: false, error: "Invalid flag submission format." };
  }

  const { data: analysis } = await supabase
    .from("material_analyses")
    .select("id")
    .eq("document_id", documentId)
    .single();

  if (!analysis) {
    return { success: false, error: "Material analysis not found." };
  }

  await supabase.from("material_corrections").insert({
    analysis_id: analysis.id,
    document_id: documentId,
    user_id: user.id,
    field: parsed.data.field,
    original_value: (parsed.data.originalValue ?? {}) as unknown as Json,
    corrected_value: (parsed.data.correctedValue ?? {}) as unknown as Json,
    flag_reason: parsed.data.reason,
  });

  return {
    success: true,
    message: "Extraction mistake recorded for review. Thank you for your feedback!",
  };
}
