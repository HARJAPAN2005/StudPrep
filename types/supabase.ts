/**
 * Global TypeScript type definitions for StudPrep.
 *
 * This is a hand-authored placeholder. Run `pnpm db:generate-types` after
 * connecting to a Supabase project to replace this with auto-generated types.
 *
 * @module types/supabase
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type NoRelationships = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "student" | "admin";
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "student" | "admin";
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "student" | "admin";
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          color: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          color?: string | null;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          code?: string;
          description?: string | null;
          color?: string | null;
          is_archived?: boolean;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      documents: {
        Row: {
          id: string;
          uploader_id: string;
          subject_id: string;
          storage_path: string;
          filename: string;
          file_size: number;
          mime_type: string;
          status: "pending" | "processing" | "ready" | "failed";
          page_count: number | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          uploader_id: string;
          subject_id: string;
          storage_path: string;
          filename: string;
          file_size: number;
          mime_type: string;
          status?: "pending" | "processing" | "ready" | "failed";
          page_count?: number | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "processing" | "ready" | "failed";
          page_count?: number | null;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      questions: {
        Row: {
          id: string;
          subject_id: string;
          document_id: string | null;
          body: string;
          options: string[];
          correct_index: number;
          explanation: string;
          difficulty: "easy" | "medium" | "hard";
          source_page: number | null;
          ai_model_version: string | null;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          document_id?: string | null;
          body: string;
          options: string[];
          correct_index: number;
          explanation: string;
          difficulty?: "easy" | "medium" | "hard";
          source_page?: number | null;
          ai_model_version?: string | null;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          options?: string[];
          correct_index?: number;
          explanation?: string;
          difficulty?: "easy" | "medium" | "hard";
          is_approved?: boolean;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      exam_sessions: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          started_at: string;
          submitted_at: string | null;
          expires_at: string;
          time_limit_mins: number;
          total_questions: number;
          score: number | null;
          status: "active" | "submitted" | "expired";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          started_at?: string;
          submitted_at?: string | null;
          expires_at: string;
          time_limit_mins: number;
          total_questions: number;
          score?: number | null;
          status?: "active" | "submitted" | "expired";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          submitted_at?: string | null;
          score?: number | null;
          status?: "active" | "submitted" | "expired";
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      session_answers: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          selected_index: number | null;
          is_correct: boolean | null;
          time_spent_secs: number | null;
          answered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          selected_index?: number | null;
          is_correct?: boolean | null;
          time_spent_secs?: number | null;
          answered_at?: string | null;
          created_at?: string;
        };
        Update: {
          selected_index?: number | null;
          is_correct?: boolean | null;
          time_spent_secs?: number | null;
          answered_at?: string | null;
        };
        Relationships: NoRelationships;
      };
      progress_snapshots: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          snapshot_date: string;
          avg_score: number | null;
          sessions_count: number;
          questions_attempted: number;
          questions_correct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          snapshot_date?: string;
          avg_score?: number | null;
          sessions_count?: number;
          questions_attempted?: number;
          questions_correct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          avg_score?: number | null;
          sessions_count?: number;
          questions_attempted?: number;
          questions_correct?: number;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      document_pages: {
        Row: {
          id: string;
          document_id: string;
          page_number: number;
          extracted_text: string;
          word_count: number;
          has_low_text: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          page_number: number;
          extracted_text: string;
          word_count?: number;
          has_low_text?: boolean;
          created_at?: string;
        };
        Update: {
          extracted_text?: string;
          word_count?: number;
          has_low_text?: boolean;
        };
        Relationships: NoRelationships;
      };
      document_processing_jobs: {
        Row: {
          id: string;
          document_id: string;
          uploader_id: string;
          status: "queued" | "processing" | "completed" | "failed" | "retryable";
          attempt_count: number;
          max_attempts: number;
          error_message: string | null;
          extraction_warnings: string[];
          ocr_required: boolean;
          ocr_applied: boolean;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          uploader_id: string;
          status?: "queued" | "processing" | "completed" | "failed" | "retryable";
          attempt_count?: number;
          max_attempts?: number;
          error_message?: string | null;
          extraction_warnings?: string[];
          ocr_required?: boolean;
          ocr_applied?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "queued" | "processing" | "completed" | "failed" | "retryable";
          attempt_count?: number;
          max_attempts?: number;
          error_message?: string | null;
          extraction_warnings?: string[];
          ocr_required?: boolean;
          ocr_applied?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
    };
    Views: {
      questions_public: {
        Row: {
          id: string;
          subject_id: string;
          body: string;
          options: string[];
          difficulty: "easy" | "medium" | "hard";
          source_page: number | null;
        };
        Relationships: NoRelationships;
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: "student" | "admin";
      document_status: "pending" | "processing" | "ready" | "failed";
      processing_job_status: "queued" | "processing" | "completed" | "failed" | "retryable";
      question_difficulty: "easy" | "medium" | "hard";
      exam_status: "active" | "submitted" | "expired";
    };
    CompositeTypes: Record<string, never>;
  };
}
