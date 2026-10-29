/**
 * Document Chunking & Source-Preserving Result Merging
 *
 * Chunks long multi-page documents into bounded windows with overlap.
 * Merges topics, questions, and content maps across chunk boundaries while
 * preserving page references, deduplicating repeated headers/footers, and
 * never silently deleting distinct questions.
 *
 * @module lib/ai/chunking
 */
import type { TopicItem, DetectedQuestion, ExtractionWarningItem } from "./schemas";

export interface PageEvidence {
  pageNumber: number;
  text: string;
}

export interface DocumentChunk {
  chunkIndex: number;
  startPage: number;
  endPage: number;
  pages: PageEvidence[];
}

/**
 * Splits document pages into overlapping bounded windows.
 * Default: 5 pages per chunk with 1 page overlap.
 */
export function createDocumentChunks(
  pages: PageEvidence[],
  chunkSize = 5,
  overlap = 1
): DocumentChunk[] {
  if (!pages || pages.length === 0) return [];

  // Sort pages strictly by page number
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const chunks: DocumentChunk[] = [];

  let startIdx = 0;
  let chunkIndex = 0;

  while (startIdx < sorted.length) {
    const endIdx = Math.min(startIdx + chunkSize, sorted.length);
    const chunkPages = sorted.slice(startIdx, endIdx);

    chunks.push({
      chunkIndex,
      startPage: chunkPages[0].pageNumber,
      endPage: chunkPages[chunkPages.length - 1].pageNumber,
      pages: chunkPages,
    });

    chunkIndex++;

    if (endIdx >= sorted.length) break;
    startIdx += Math.max(1, chunkSize - overlap);
  }

  return chunks;
}

/**
 * Normalizes text strings for comparison (lowercased, stripped punctuation & whitespace).
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Merges topic hierarchies across chunks, deduplicating matching topics while
 * consolidating page references and subtopic evidence.
 */
export function mergeTopicHierarchies(chunkTopicLists: TopicItem[][]): TopicItem[] {
  const mergedMap = new Map<string, TopicItem>();

  for (const list of chunkTopicLists) {
    for (const topic of list) {
      const key = normalizeText(topic.title);
      const existing = mergedMap.get(key);

      if (!existing) {
        mergedMap.set(key, {
          ...topic,
          pageReferences: [...new Set(topic.pageReferences)].sort((a, b) => a - b),
          subtopics: [...topic.subtopics],
        });
      } else {
        // Merge page references
        existing.pageReferences = [
          ...new Set([...existing.pageReferences, ...topic.pageReferences]),
        ].sort((a, b) => a - b);

        // Merge subtopics
        for (const sub of topic.subtopics) {
          const subKey = normalizeText(sub.title);
          const existingSub = existing.subtopics.find(
            (s) => normalizeText(s.title) === subKey
          );

          if (!existingSub) {
            existing.subtopics.push(sub);
          } else {
            existingSub.pageReferences = [
              ...new Set([...existingSub.pageReferences, ...sub.pageReferences]),
            ].sort((a, b) => a - b);
          }
        }
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Merges detected questions across chunks.
 * Safeguards:
 * - Deduplicates questions that appear in overlapping chunk boundaries.
 * - NEVER deletes distinct questions that happen to share question numbering (e.g. Section A Q1 vs Section B Q1).
 */
export function mergeDetectedQuestions(
  chunkQuestionLists: DetectedQuestion[][]
): DetectedQuestion[] {
  const mergedQuestions: DetectedQuestion[] = [];

  for (const list of chunkQuestionLists) {
    for (const question of list) {
      const normBody = normalizeText(question.body);

      // Check if this question is already present (same body on adjacent or same page)
      const existingIdx = mergedQuestions.findIndex((q) => {
        const bodyMatch = normalizeText(q.body) === normBody;
        const pageMatch = Math.abs(q.pageNumber - question.pageNumber) <= 1;
        return bodyMatch && pageMatch;
      });

      if (existingIdx === -1) {
        mergedQuestions.push(question);
      } else {
        // Merge: keep the more complete question (more options or contains answerKey)
        const existing = mergedQuestions[existingIdx];
        if (!existing.answerKey && question.answerKey) {
          existing.answerKey = question.answerKey;
        }
        if (question.options.length > existing.options.length) {
          existing.options = question.options;
          existing.isComplete = question.isComplete;
          existing.missingElements = question.missingElements;
        }
      }
    }
  }

  // Sort in document order (page number then questionNumber)
  return mergedQuestions.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Deduplicates warnings across chunk boundaries.
 */
export function deduplicateWarnings(
  warnings: ExtractionWarningItem[]
): ExtractionWarningItem[] {
  const seen = new Set<string>();
  const deduplicated: ExtractionWarningItem[] = [];

  for (const w of warnings) {
    const key = `${w.code}:${w.pageNumber}:${normalizeText(w.message)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(w);
    }
  }

  return deduplicated;
}

