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
      material_analyses: {
        Row: {
          id: string;
          document_id: string;
          uploader_id: string;
          version: number;
          status: "pending" | "classifying" | "extracting_topics" | "detecting_questions" | "mapping_content" | "completed" | "failed";
          current_stage: number;
          classification: Json;
          topics_hierarchy: Json;
          extracted_questions: Json;
          content_map: Json;
          extraction_warnings: string[];
          stage_checkpoints: Json;
          error_message: string | null;
          token_usage: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          uploader_id: string;
          version?: number;
          status?: "pending" | "classifying" | "extracting_topics" | "detecting_questions" | "mapping_content" | "completed" | "failed";
          current_stage?: number;
          classification?: Json;
          topics_hierarchy?: Json;
          extracted_questions?: Json;
          content_map?: Json;
          extraction_warnings?: string[];
          stage_checkpoints?: Json;
          error_message?: string | null;
          token_usage?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "classifying" | "extracting_topics" | "detecting_questions" | "mapping_content" | "completed" | "failed";
          current_stage?: number;
          classification?: Json;
          topics_hierarchy?: Json;
          extracted_questions?: Json;
          content_map?: Json;
          extraction_warnings?: string[];
          stage_checkpoints?: Json;
          error_message?: string | null;
          token_usage?: Json;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      material_corrections: {
        Row: {
          id: string;
          analysis_id: string;
          document_id: string;
          user_id: string;
          field: string;
          original_value: Json;
          corrected_value: Json;
          flag_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          document_id: string;
          user_id: string;
          field: string;
          original_value: Json;
          corrected_value: Json;
          flag_reason?: string | null;
          created_at?: string;
        };
        Update: {
          field?: string;
          original_value?: Json;
          corrected_value?: Json;
          flag_reason?: string | null;
        };
        Relationships: NoRelationships;
      };
      exam_configurations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subject_id: string;
          mode: "recreate_source" | "generate_practice" | "mixed";
          material_ids: string[];
          topic_ids: string[];
          question_count: number;
          duration_minutes: number;
          difficulty_distribution: Json;
          marks_per_question: number;
          negative_marking: number;
          shuffle_questions: boolean;
          shuffle_options: boolean;
          feedback_timing: "immediate" | "after_submission";
          sections: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          subject_id: string;
          mode?: "recreate_source" | "generate_practice" | "mixed";
          material_ids?: string[];
          topic_ids?: string[];
          question_count: number;
          duration_minutes: number;
          difficulty_distribution?: Json;
          marks_per_question?: number;
          negative_marking?: number;
          shuffle_questions?: boolean;
          shuffle_options?: boolean;
          feedback_timing?: "immediate" | "after_submission";
          sections?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          subject_id?: string;
          mode?: "recreate_source" | "generate_practice" | "mixed";
          material_ids?: string[];
          topic_ids?: string[];
          question_count?: number;
          duration_minutes?: number;
          difficulty_distribution?: Json;
          marks_per_question?: number;
          negative_marking?: number;
          shuffle_questions?: boolean;
          shuffle_options?: boolean;
          feedback_timing?: "immediate" | "after_submission";
          sections?: Json;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      exam_snapshots: {
        Row: {
          id: string;
          configuration_id: string | null;
          user_id: string;
          version: number;
          title: string;
          subject_id: string;
          mode: "recreate_source" | "generate_practice" | "mixed";
          duration_minutes: number;
          total_questions: number;
          total_marks: number;
          negative_marking: number;
          sections: Json;
          questions: Json;
          published_at: string;
        };
        Insert: {
          id?: string;
          configuration_id?: string | null;
          user_id: string;
          version?: number;
          title: string;
          subject_id: string;
          mode: "recreate_source" | "generate_practice" | "mixed";
          duration_minutes: number;
          total_questions: number;
          total_marks: number;
          negative_marking?: number;
          sections?: Json;
          questions: Json;
          published_at?: string;
        };
        Update: {
          title?: string;
          duration_minutes?: number;
          total_questions?: number;
          total_marks?: number;
          negative_marking?: number;
          sections?: Json;
          questions?: Json;
        };
        Relationships: NoRelationships;
      };
      exam_attempts: {
        Row: {
          id: string;
          snapshot_id: string;
          student_id: string;
          status: "not_started" | "in_progress" | "submitted" | "expired";
          started_at: string | null;
          expires_at: string | null;
          submitted_at: string | null;
          question_order: Json;
          option_orders: Json;
          answers: Json;
          review_flags: Json;
          visited_questions: Json;
          score: number | null;
          marks_obtained: number | null;
          max_marks: number | null;
          accuracy: number | null;
          section_scores: Json;
          topic_scores: Json;
          detailed_results: Json;
          attempt_number: number;
          correct_count: number;
          incorrect_count: number;
          unanswered_count: number;
          time_spent_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          student_id: string;
          status?: "not_started" | "in_progress" | "submitted" | "expired";
          started_at?: string | null;
          expires_at?: string | null;
          submitted_at?: string | null;
          question_order?: Json;
          option_orders?: Json;
          answers?: Json;
          review_flags?: Json;
          visited_questions?: Json;
          score?: number | null;
          marks_obtained?: number | null;
          max_marks?: number | null;
          accuracy?: number | null;
          section_scores?: Json;
          topic_scores?: Json;
          detailed_results?: Json;
          attempt_number?: number;
          correct_count?: number;
          incorrect_count?: number;
          unanswered_count?: number;
          time_spent_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "not_started" | "in_progress" | "submitted" | "expired";
          started_at?: string | null;
          expires_at?: string | null;
          submitted_at?: string | null;
          question_order?: Json;
          option_orders?: Json;
          answers?: Json;
          review_flags?: Json;
          visited_questions?: Json;
          score?: number | null;
          marks_obtained?: number | null;
          max_marks?: number | null;
          accuracy?: number | null;
          section_scores?: Json;
          topic_scores?: Json;
          detailed_results?: Json;
          attempt_number?: number;
          correct_count?: number;
          incorrect_count?: number;
          unanswered_count?: number;
          time_spent_seconds?: number;
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      reported_questions: {
        Row: {
          id: string;
          attempt_id: string;
          student_id: string;
          question_id: string;
          issue_type: "incorrect_answer_key" | "ambiguous_question" | "typo_formatting" | "outdated_syllabus" | "other";
          comment: string | null;
          status: "open" | "reviewed" | "resolved" | "dismissed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          student_id: string;
          question_id: string;
          issue_type: "incorrect_answer_key" | "ambiguous_question" | "typo_formatting" | "outdated_syllabus" | "other";
          comment?: string | null;
          status?: "open" | "reviewed" | "resolved" | "dismissed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          issue_type?: "incorrect_answer_key" | "ambiguous_question" | "typo_formatting" | "outdated_syllabus" | "other";
          comment?: string | null;
          status?: "open" | "reviewed" | "resolved" | "dismissed";
          updated_at?: string;
        };
        Relationships: NoRelationships;
      };
      question_tutor_cache: {
        Row: {
          id: string;
          attempt_id: string;
          student_id: string;
          question_id: string;
          response: Json;
          input_tokens: number;
          output_tokens: number;
          latency_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          student_id: string;
          question_id: string;
          response: Json;
          input_tokens?: number;
          output_tokens?: number;
          latency_ms?: number;
          created_at?: string;
        };
        Update: {
          response?: Json;
          input_tokens?: number;
          output_tokens?: number;
          latency_ms?: number;
        };
        Relationships: NoRelationships;
      };
      exam_integrity_events: {
        Row: {
          id: string;
          attempt_id: string;
          student_id: string;
          event_type: "fullscreen_entry" | "fullscreen_exit" | "visibility_hidden" | "visibility_visible" | "window_blur" | "window_focus" | "reconnect" | "submission" | "heartbeat";
          metadata: Json;
          client_timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          student_id: string;
          event_type: "fullscreen_entry" | "fullscreen_exit" | "visibility_hidden" | "visibility_visible" | "window_blur" | "window_focus" | "reconnect" | "submission" | "heartbeat";
          metadata?: Json;
          client_timestamp: string;
          created_at?: string;
        };
        Update: {
          event_type?: "fullscreen_entry" | "fullscreen_exit" | "visibility_hidden" | "visibility_visible" | "window_blur" | "window_focus" | "reconnect" | "submission" | "heartbeat";
          metadata?: Json;
          client_timestamp?: string;
        };
        Relationships: NoRelationships;
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          target_type: string;
          target_id: string;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          target_type: string;
          target_id: string;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          action?: string;
          target_type?: string;
          target_id?: string;
          details?: Json;
          ip_address?: string | null;
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
      analysis_stage_status: "pending" | "classifying" | "extracting_topics" | "detecting_questions" | "mapping_content" | "completed" | "failed";
      question_difficulty: "easy" | "medium" | "hard";
      exam_status: "active" | "submitted" | "expired";
      exam_mode: "recreate_source" | "generate_practice" | "mixed";
      exam_question_type: "single_choice" | "true_false";
      attempt_status: "not_started" | "in_progress" | "submitted" | "expired";
    };
    CompositeTypes: Record<string, never>;
  };
}
